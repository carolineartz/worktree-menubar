import type { AppState, RendererApi } from '../../../shared/ipc'
import {
  makeMockWorktrees,
  MOCK_CONFIG,
  MOCK_FAIL_DETAIL,
  MOCK_STATUSES
} from '../../../shared/mockData'
import type { OpError, OpResult, StackStatus } from '../../../shared/types'

/**
 * In-renderer stand-in for the main process. Used when the preload bridge is
 * absent (vite-only dev / browser preview); mirrors the design prototype's
 * timed start/stop transitions so the UI is fully explorable.
 */
function createMockApi(): RendererApi {
  const statuses: Record<string, StackStatus> = { ...MOCK_STATUSES }
  const promoted = new Set<string>()
  const destroyed = new Set<string>()
  const errors = new Map<string, OpError>()
  const labels = new Map(makeMockWorktrees({}).map((w) => [w.id, w.label]))

  const state: AppState = {
    configState: 'ok',
    configError: null,
    dockerRunning: true,
    worktrees: makeMockWorktrees(statuses, promoted, destroyed),
    lastRefreshAt: Date.now() - 4_000,
    config: MOCK_CONFIG
  }

  let dataListeners: ((s: AppState) => void)[] = []
  let opListeners: ((r: OpResult) => void)[] = []
  const push = (): void => {
    state.worktrees = makeMockWorktrees(statuses, promoted, destroyed).map((w) => ({
      ...w,
      lastError: errors.get(w.id) ?? null
    }))
    dataListeners.forEach((cb) => cb({ ...state }))
  }
  const opDone = (r: OpResult): void => {
    if (r.ok) errors.delete(r.id)
    else errors.set(r.id, { kind: r.kind, message: r.message, detail: r.detail, at: Date.now() })
    opListeners.forEach((cb) => cb(r))
  }
  const transition = (
    id: string,
    during: StackStatus,
    after: StackStatus,
    ms: number,
    result: (label: string) => OpResult
  ): void => {
    statuses[id] = during
    push()
    setTimeout(() => {
      statuses[id] = after
      opDone(result(labels.get(id) ?? id))
      push()
    }, ms)
  }

  return {
    getState: async () => ({ ...state }),
    refresh: async () => {
      state.lastRefreshAt = Date.now()
      push()
    },
    openUrl: async (id) => console.log('[mock] open url', id),
    openEditor: async (id) => console.log('[mock] open editor', id),
    launchClaude: async (id, mode) => console.log('[mock] claude', mode, id),
    startStack: async (id) =>
      transition(id, 'starting', 'running', 1400, (label) => ({
        id,
        kind: 'start',
        ok: true,
        message: `${label} is up`,
        detail: null
      })),
    stopStack: async (id) =>
      transition(id, 'stopping', 'stopped', 1000, (label) => ({
        id,
        kind: 'stop',
        ok: true,
        message: `${label} stopped`,
        detail: null
      })),
    destroyWorktree: async (id, opts) => {
      statuses[id] = 'destroying'
      push()
      setTimeout(() => {
        const label = labels.get(id) ?? id
        if (id === 'ltn-101') {
          statuses[id] = 'stopped'
          opDone({
            id,
            kind: 'destroy',
            ok: false,
            message: `${label}: worktree remove failed`,
            detail: MOCK_FAIL_DETAIL
          })
          push()
          return
        }
        destroyed.add(id)
        opDone({
          id,
          kind: 'destroy',
          ok: true,
          message: `Destroyed ${label} — stack, volumes & worktree removed${opts.deleteBranch ? ', branch deleted' : ''}`,
          detail: null
        })
        push()
      }, 4000)
    },
    promoteWorktree: async (id) => {
      statuses[id] = 'promoting'
      push()
      setTimeout(() => {
        promoted.add(id)
        statuses[id] = 'running'
        opDone({
          id,
          kind: 'promote',
          ok: true,
          message: `${labels.get(id) ?? id} promoted`,
          detail: null
        })
        push()
      }, 2400)
    },
    openJira: async (id) => console.log('[mock] open jira', id),
    openPr: async (id) => console.log('[mock] open pr', id),
    dismissError: async (id) => {
      errors.delete(id)
      push()
    },
    openOpsLog: async () => console.log('[mock] open ops log'),
    createConfig: async () => {
      state.configState = 'ok'
      push()
    },
    getConfig: async () => state.config,
    setConfig: async (patch) => {
      state.config = { ...state.config, ...patch }
      push()
    },
    openSettingsWindow: async () => console.log('[mock] open settings'),
    resizePopover: async () => {},
    onDataUpdated: (cb) => {
      dataListeners.push(cb)
      return () => {
        dataListeners = dataListeners.filter((l) => l !== cb)
      }
    },
    onOpDone: (cb) => {
      opListeners.push(cb)
      return () => {
        opListeners = opListeners.filter((l) => l !== cb)
      }
    },
    onPopoverShown: () => () => {}
  }
}

export const api: RendererApi = window.api ?? createMockApi()
