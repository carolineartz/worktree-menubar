import { ipcMain, shell } from 'electron'
import { CHANNELS } from '../shared/ipc'
import { devUrl } from '../shared/present'
import type { Config, WorktreeId, WorktreeSnapshot } from '../shared/types'
import type { Coordinator } from './coordinator'
import type { ConfigSource } from './config'

export interface StackOps {
  start(id: WorktreeId): void
  stop(id: WorktreeId): void
  teardown(id: WorktreeId): void
  /** absolute path for the editor command (mock returns null → no-op) */
  editorPath(id: WorktreeId): string | null
}

export function registerIpcHandlers(deps: {
  coordinator: Coordinator
  config: ConfigSource
  ops: StackOps
  refresh: () => void
  openEditor: (path: string) => void
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
    const w = wt(id)
    if (w) void shell.openExternal(devUrl(config.get().urlTemplate, w.port))
  })

  ipcMain.handle(CHANNELS.openEditor, (_e, id: WorktreeId) => {
    const path = ops.editorPath(id)
    if (path) deps.openEditor(path)
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

  ipcMain.handle(CHANNELS.teardownStack, (_e, id: WorktreeId) => {
    ops.teardown(id)
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
