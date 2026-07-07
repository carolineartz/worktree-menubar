import type { BrowserWindow } from 'electron'
import type { AppState } from '../shared/ipc'
import { CHANNELS } from '../shared/ipc'
import type { OpResult, WorktreeSnapshot } from '../shared/types'
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

  constructor(
    private config: ConfigSource,
    private targets: {
      getWindow(): BrowserWindow | null
      setCount(running: number, total: number): void
    }
  ) {}

  snapshot(): AppState {
    return {
      configState: this.config.state,
      configError: this.config.error,
      dockerRunning: this.dockerRunning,
      worktrees: this.worktrees,
      lastRefreshAt: this.lastRefreshAt,
      config: this.config.get()
    }
  }

  /** Recompute the tray count + push fresh state. Call after any change. */
  publish(): void {
    const total = this.worktrees.length
    const running = this.worktrees.filter((w) => w.status === 'running').length
    const show = this.config.get().showCountInMenuBar && this.config.state === 'ok' && total > 0
    this.targets.setCount(show ? running : -1, total)

    const win = this.targets.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(CHANNELS.dataUpdated, this.snapshot())
    }
  }

  setData(worktrees: WorktreeSnapshot[], dockerRunning: boolean): void {
    this.worktrees = worktrees
    this.dockerRunning = dockerRunning
    this.lastRefreshAt = Date.now()
    this.publish()
  }

  pushOpDone(result: OpResult): void {
    const win = this.targets.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(CHANNELS.opDone, result)
    }
  }
}
