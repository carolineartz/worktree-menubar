import type { Config, ConfigState, OpResult, WorktreeId, WorktreeSnapshot } from './types'

/** Full state pushed to the popover after every poll or mutation. */
export interface AppState {
  configState: ConfigState
  /** parse error detail when configState === 'error' */
  configError: string | null
  dockerRunning: boolean
  worktrees: WorktreeSnapshot[]
  /** epoch ms of last successful scan (null before first) */
  lastRefreshAt: number | null
  config: Config
}

/** Renderer → main (ipcRenderer.invoke). */
export interface Invokers {
  getState(): Promise<AppState>
  refresh(): Promise<void>
  /** open the worktree's dev URL (urlTemplate + port) in the browser */
  openUrl(id: WorktreeId): Promise<void>
  /** open the worktree directory with the configured editor command */
  openEditor(id: WorktreeId): Promise<void>
  /** docker compose up -d */
  startStack(id: WorktreeId): Promise<void>
  /** docker compose stop */
  stopStack(id: WorktreeId): Promise<void>
  /** docker compose down -v — removes containers + volumes, never the worktree */
  teardownStack(id: WorktreeId): Promise<void>
  /** write a default ~/.config/worktree-menubar.json */
  createConfig(): Promise<void>
  getConfig(): Promise<Config>
  setConfig(patch: Partial<Config>): Promise<void>
  openSettingsWindow(): Promise<void>
  /** Ask the popover window to match the content's natural height. */
  resizePopover(height: number): Promise<void>
}

/** Exposed on window.api by the preload script. */
export interface RendererApi extends Invokers {
  onDataUpdated(cb: (state: AppState) => void): () => void
  onOpDone(cb: (result: OpResult) => void): () => void
  onPopoverShown(cb: () => void): () => void
}

export const CHANNELS = {
  getState: 'state:get',
  refresh: 'refresh',
  openUrl: 'wt:openUrl',
  openEditor: 'wt:openEditor',
  startStack: 'wt:start',
  stopStack: 'wt:stop',
  teardownStack: 'wt:teardown',
  createConfig: 'config:create',
  getConfig: 'config:get',
  setConfig: 'config:set',
  openSettingsWindow: 'settings:openWindow',
  resizePopover: 'popover:resize',
  dataUpdated: 'data:updated',
  opDone: 'op:done',
  popoverShown: 'popover:shown'
} as const
