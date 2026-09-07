/** Absolute worktree path — stable identity across polls. */
export type WorktreeId = string

/**
 * Derived live from `docker compose ls`; 'starting'/'stopping' are optimistic
 * while an up/stop/down command is in flight. 'promoting' is the unserved-row
 * equivalent: the promote command is running.
 */
export type StackStatus = 'running' | 'starting' | 'stopping' | 'stopped' | 'promoting'

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
  /** the dev-server (FE) port — null for unserved worktrees */
  port: number | null
  extras: ExtraPort[]
  /** display path, ~-abbreviated */
  path: string
  status: StackStatus
  /** false = no dev port in .env — listed under "more", promotable */
  served: boolean
  /** jiraBaseUrl/browse/<ticket> when configured and the branch has a ticket key */
  jiraUrl: string | null
  /** the branch's GitHub PR (resolved via `gh`), when one exists */
  prUrl: string | null
  /** tooltip for the PR button, e.g. "PR #4312 · open" */
  prLabel: string | null
  /** the branch's PR has been merged — the row's dot becomes a merge glyph */
  prMerged: boolean
}

export interface DestroyOptions {
  /** also `git branch -D` the local branch after the worktree is removed */
  deleteBranch: boolean
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
  /**
   * Health-probe path on the dev port (e.g. "/api/configs"): a stack whose
   * containers are up but that doesn't answer 2xx here shows as 'starting'
   * instead of 'running'. Empty string disables the probe.
   */
  healthPath: string
  /** .env key naming the compose project; falls back to the directory name */
  composeProjectKey: string
  /** command for "Editor", invoked with the worktree path */
  editorCommand: string
  /**
   * Jira site root, e.g. "https://cutover.atlassian.net". When set, rows whose
   * branch contains a ticket key (ABC-123) get a Jira link button. Empty
   * string disables it.
   */
  jiraBaseUrl: string
  /**
   * Shell command that turns an unserved worktree into a served one
   * ({branch} and {path} placeholders; runs with the worktree as cwd),
   * e.g. "cutover-work {branch} --local --no-open". Empty string hides
   * the Promote button.
   */
  promoteCommand: string
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
  healthPath: '',
  composeProjectKey: 'COMPOSE_PROJECT_NAME',
  editorCommand: 'code',
  jiraBaseUrl: '',
  promoteCommand: '',
  includeMainCheckout: false,
  theme: 'system',
  refreshSeconds: 10,
  showCountInMenuBar: true,
  launchAtLogin: false
}

/** Result of a start/stop/destroy/promote command, pushed to the renderer for toasts. */
export interface OpResult {
  id: WorktreeId
  kind: 'start' | 'stop' | 'destroy' | 'promote'
  ok: boolean
  /** toast text, e.g. "MDW-214 is up" */
  message: string
}
