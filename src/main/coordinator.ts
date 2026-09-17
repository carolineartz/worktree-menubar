import type { BrowserWindow } from 'electron'
import type { AppState } from '../shared/ipc'
import { CHANNELS } from '../shared/ipc'
import type { OpError, OpResult, WorktreeSnapshot } from '../shared/types'
import type { ConfigSource } from './config'

/**
 * Owns the runtime data (worktree snapshots, docker/config state) and
 * composes the full AppState pushed to the popover. All mutations funnel
 * through here so the tray count and popover stay consistent.
 */
export class Coordinator {
  worktrees: WorktreeSnapshot[] = []
  dockerRunning = true
  lastRefreshAt: number | null = null
  /** failed ops by worktree id — pinned under the row until dismissed */
  private errors = new Map<string, OpError>()

  constructor(
    private config: ConfigSource,
    private targets: {
      getWindow(): BrowserWindow | null
      setCount(running: number, total: number, alerts: boolean): void
    }
  ) {}

  snapshot(): AppState {
    return {
      configState: this.config.state,
      configError: this.config.error,
      dockerRunning: this.dockerRunning,
      worktrees: this.worktrees.map((w) => ({ ...w, lastError: this.errors.get(w.id) ?? null })),
      lastRefreshAt: this.lastRefreshAt,
      config: this.config.get()
    }
  }

  /** Recompute the tray count + push fresh state. Call after any change. */
  publish(): void {
    // unserved ("more") worktrees don't count toward the tray's running/total
    const served = this.worktrees.filter((w) => w.served)
    const total = served.length
    const running = served.filter((w) => w.status === 'running').length
    const show = this.config.get().showCountInMenuBar && this.config.state === 'ok' && total > 0
    this.targets.setCount(show ? running : -1, total, this.errors.size > 0)

    const win = this.targets.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(CHANNELS.dataUpdated, this.snapshot())
    }
  }

  setData(worktrees: WorktreeSnapshot[], dockerRunning: boolean): void {
    // a failure pinned to a worktree that no longer exists has nothing to hang on
    const ids = new Set(worktrees.map((w) => w.id))
    for (const id of this.errors.keys()) if (!ids.has(id)) this.errors.delete(id)
    this.worktrees = worktrees
    this.dockerRunning = dockerRunning
    this.lastRefreshAt = Date.now()
    this.publish()
  }

  /** Drop a row right away (a destroy finished) — the follow-up poll confirms. */
  removeWorktree(id: string): void {
    const next = this.worktrees.filter((w) => w.id !== id)
    if (next.length === this.worktrees.length) return
    this.worktrees = next
    this.publish()
  }

  clearError(id: string): void {
    if (this.errors.delete(id)) this.publish()
  }

  hasError(id: string): boolean {
    return this.errors.has(id)
  }

  /** Record the outcome: a failure pins under the row, a success clears any earlier one. */
  pushOpDone(result: OpResult): void {
    if (result.ok) this.errors.delete(result.id)
    else {
      this.errors.set(result.id, {
        kind: result.kind,
        message: result.message,
        detail: result.detail,
        at: Date.now()
      })
    }
    this.publish()
    const win = this.targets.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(CHANNELS.opDone, result)
    }
  }
}
