import { contextBridge, ipcRenderer } from 'electron'
import type { AppState, RendererApi } from '../shared/ipc'
import { CHANNELS } from '../shared/ipc'
import type { Config, OpResult, WorktreeId } from '../shared/types'

const api: RendererApi = {
  getState: () => ipcRenderer.invoke(CHANNELS.getState),
  refresh: () => ipcRenderer.invoke(CHANNELS.refresh),
  openUrl: (id: WorktreeId) => ipcRenderer.invoke(CHANNELS.openUrl, id),
  openEditor: (id: WorktreeId) => ipcRenderer.invoke(CHANNELS.openEditor, id),
  startStack: (id: WorktreeId) => ipcRenderer.invoke(CHANNELS.startStack, id),
  stopStack: (id: WorktreeId) => ipcRenderer.invoke(CHANNELS.stopStack, id),
  downStack: (id: WorktreeId) => ipcRenderer.invoke(CHANNELS.downStack, id),
  destroyWorktree: (id: WorktreeId) => ipcRenderer.invoke(CHANNELS.destroyWorktree, id),
  createConfig: () => ipcRenderer.invoke(CHANNELS.createConfig),
  getConfig: () => ipcRenderer.invoke(CHANNELS.getConfig),
  setConfig: (patch: Partial<Config>) => ipcRenderer.invoke(CHANNELS.setConfig, patch),
  openSettingsWindow: () => ipcRenderer.invoke(CHANNELS.openSettingsWindow),
  resizePopover: (height: number) => ipcRenderer.invoke(CHANNELS.resizePopover, height),
  onDataUpdated: (cb: (state: AppState) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, state: AppState): void => cb(state)
    ipcRenderer.on(CHANNELS.dataUpdated, listener)
    return () => ipcRenderer.removeListener(CHANNELS.dataUpdated, listener)
  },
  onOpDone: (cb: (result: OpResult) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, result: OpResult): void => cb(result)
    ipcRenderer.on(CHANNELS.opDone, listener)
    return () => ipcRenderer.removeListener(CHANNELS.opDone, listener)
  },
  onPopoverShown: (cb: () => void) => {
    const listener = (): void => cb()
    ipcRenderer.on(CHANNELS.popoverShown, listener)
    return () => ipcRenderer.removeListener(CHANNELS.popoverShown, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
