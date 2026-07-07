/** Absolute worktree path — stable identity across polls. */
export type WorktreeId = string

/**
 * Derived live from `docker compose ls`; 'starting'/'stopping' are optimistic
 * while an up/stop/down command is in flight.
 */
export type StackStatus = 'running' | 'starting' | 'stopping' | 'stopped'

export interface ExtraPort {
  /** chip label, e.g. "api" — rendered uppercase */
  key: string
  port: number
}

export interface WorktreeSnapshot {
  id: WorktreeId
  /** repo the worktree belongs to (directory basename of the repo root) */
  repo: string
  /** ticket label for the meta line, e.g. "MDW-214" */
  label: string
  branch: string
  /** the dev-server (FE) port — worktrees without one are skipped */
  port: number
  extras: ExtraPort[]
  /** display path, ~-abbreviated */
  path: string
  status: StackStatus
}

export type ConfigState = 'ok' | 'missing' | 'error'

export type ThemePreference = 'system' | 'light' | 'dark'

/** Persisted at ~/.config/worktree-menubar.json — hand-editable. */
export interface Config {
  /** absolute repo roots whose worktrees are scanned */
  repos: string[]
  /** .env key holding the dev-server port */
  devPortKey: string
  /** .env keys surfaced as extra port chips (label = key minus _PORT) */
  extraPortKeys: string[]
  /** {port} is replaced with the worktree's dev port */
  urlTemplate: string
  /** .env key naming the compose project; falls back to the directory name */
  composeProjectKey: string
  /** command for "Editor", invoked with the worktree path */
  editorCommand: string
  includeMainCheckout: boolean
  theme: ThemePreference
  refreshSeconds: number
  showCountInMenuBar: boolean
  launchAtLogin: boolean
}

export const DEFAULT_CONFIG: Config = {
  repos: [],
  devPortKey: 'FE_PORT',
  extraPortKeys: ['API_PORT', 'WS_PORT', 'DB_PORT'],
  urlTemplate: 'http://localhost:{port}/',
  composeProjectKey: 'COMPOSE_PROJECT_NAME',
  editorCommand: 'code',
  includeMainCheckout: false,
  theme: 'system',
  refreshSeconds: 10,
  showCountInMenuBar: true,
  launchAtLogin: false
}

/** Result of a start/stop/teardown command, pushed to the renderer for toasts. */
export interface OpResult {
  id: WorktreeId
  kind: 'start' | 'stop' | 'teardown'
  ok: boolean
  /** toast text, e.g. "MDW-214 is up" */
  message: string
}
