import { ipcMain, shell } from 'electron'
import { opsLogPath } from './opsLog'
import { CHANNELS } from '../shared/ipc'
import type {
  ClaudeMode,
  Config,
  DestroyOptions,
  WorktreeId,
  WorktreeSnapshot
} from '../shared/types'
import type { Coordinator } from './coordinator'
import type { ConfigSource } from './config'

export interface StackOps {
  start(id: WorktreeId): void
  stop(id: WorktreeId): void
  destroy(id: WorktreeId, opts: DestroyOptions): void
  promote(id: WorktreeId): void
  /** absolute path for the editor and Claude commands (mock returns null → no-op) */
  worktreePath(id: WorktreeId): string | null
}

export function registerIpcHandlers(deps: {
  coordinator: Coordinator
  config: ConfigSource
  ops: StackOps
  refresh: () => void
  openEditor: (path: string) => void
  launchClaude: (id: WorktreeId, path: string, mode: ClaudeMode) => void
  openSettingsWindow: () => void
  onConfigChanged: () => void
  resizePopover: (height: number) => void
}): void {
  const { coordinator, config, ops } = deps
  const wt = (id: WorktreeId): WorktreeSnapshot | undefined =>
    coordinator.worktrees.find((w) => w.id === id)

  ipcMain.handle(CHANNELS.getState, () => coordinator.snapshot())

  ipcMain.handle(CHANNELS.refresh, () => deps.refresh())

  ipcMain.handle(CHANNELS.openUrl, (_e, id: WorktreeId) => {
    const url = wt(id)?.url
    if (url) void shell.openExternal(url)
  })

  ipcMain.handle(CHANNELS.openJira, (_e, id: WorktreeId) => {
    const url = wt(id)?.jiraUrl
    if (url) void shell.openExternal(url)
  })

  ipcMain.handle(CHANNELS.openPr, (_e, id: WorktreeId) => {
    const url = wt(id)?.prUrl
    if (url) void shell.openExternal(url)
  })

  ipcMain.handle(CHANNELS.dismissError, (_e, id: WorktreeId) => coordinator.clearError(id))

  ipcMain.handle(CHANNELS.openOpsLog, () => void shell.openPath(opsLogPath()))

  ipcMain.handle(CHANNELS.openEditor, (_e, id: WorktreeId) => {
    const path = ops.worktreePath(id)
    if (path) deps.openEditor(path)
  })

  ipcMain.handle(CHANNELS.launchClaude, (_e, id: WorktreeId, mode: ClaudeMode) => {
    const path = ops.worktreePath(id)
    if (path) deps.launchClaude(id, path, mode === 'resume' ? 'resume' : 'new')
  })

  // re-poll rather than republish: the optimistic starting…/stopping… status
  // is derived during a scan, so a fresh poll reflects the pending op at once
  ipcMain.handle(CHANNELS.startStack, (_e, id: WorktreeId) => {
    ops.start(id)
    deps.refresh()
  })

  ipcMain.handle(CHANNELS.stopStack, (_e, id: WorktreeId) => {
    ops.stop(id)
    deps.refresh()
  })

  ipcMain.handle(CHANNELS.destroyWorktree, (_e, id: WorktreeId, opts?: DestroyOptions) => {
    ops.destroy(id, { deleteBranch: opts?.deleteBranch === true })
    deps.refresh()
  })

  ipcMain.handle(CHANNELS.promoteWorktree, (_e, id: WorktreeId) => {
    ops.promote(id)
    deps.refresh()
  })

  ipcMain.handle(CHANNELS.createConfig, () => {
    config.createDefault()
    deps.onConfigChanged()
  })

  ipcMain.handle(CHANNELS.getConfig, () => config.get())

  ipcMain.handle(CHANNELS.setConfig, (_e, patch: Partial<Config>) => {
    config.patch(patch)
    deps.onConfigChanged()
    coordinator.publish()
  })

  ipcMain.handle(CHANNELS.openSettingsWindow, () => deps.openSettingsWindow())

  ipcMain.handle(CHANNELS.resizePopover, (_e, height: number) => {
    if (typeof height === 'number' && Number.isFinite(height)) deps.resizePopover(height)
  })
}
