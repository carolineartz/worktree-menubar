import type { AppState, RendererApi } from '../../../shared/ipc'
import { makeMockWorktrees, MOCK_CONFIG, MOCK_STATUSES } from '../../../shared/mockData'
import type { OpResult, StackStatus } from '../../../shared/types'

/**
 * In-renderer stand-in for the main process. Used when the preload bridge is
 * absent (vite-only dev / browser preview); mirrors the design prototype's
 * timed start/stop transitions so the UI is fully explorable.
 */
function createMockApi(): RendererApi {
  const statuses: Record<string, StackStatus> = { ...MOCK_STATUSES }
  const promoted = new Set<string>()
  const destroyed = new Set<string>()
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
    state.worktrees = makeMockWorktrees(statuses, promoted, destroyed)
    dataListeners.forEach((cb) => cb({ ...state }))
  }
  const opDone = (r: OpResult): void => {
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
    startStack: async (id) =>
      transition(id, 'starting', 'running', 1400, (label) => ({
        id,
        kind: 'start',
        ok: true,
        message: `${label} is up`
      })),
    stopStack: async (id) =>
      transition(id, 'stopping', 'stopped', 1000, (label) => ({
        id,
        kind: 'stop',
        ok: true,
        message: `${label} stopped`
      })),
    destroyWorktree: async (id, opts) => {
      statuses[id] = 'stopping'
      push()
      setTimeout(() => {
        destroyed.add(id)
        opDone({
          id,
          kind: 'destroy',
          ok: true,
          message: `Destroyed ${labels.get(id) ?? id} — stack, volumes & worktree removed${opts.deleteBranch ? ', branch deleted' : ''}`
        })
        push()
      }, 1200)
    },
    promoteWorktree: async (id) => {
      statuses[id] = 'promoting'
      push()
      setTimeout(() => {
        promoted.add(id)
        statuses[id] = 'running'
        opDone({ id, kind: 'promote', ok: true, message: `${labels.get(id) ?? id} promoted` })
        push()
      }, 2400)
    },
    openJira: async (id) => console.log('[mock] open jira', id),
    openPr: async (id) => console.log('[mock] open pr', id),
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
