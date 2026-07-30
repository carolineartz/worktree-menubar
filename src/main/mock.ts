import type { ConfigState, Config, OpResult, StackStatus, WorktreeSnapshot } from '../shared/types'
import { makeMockWorktrees, MOCK_CONFIG, MOCK_STATUSES } from '../shared/mockData'
import type { ConfigSource } from './config'
import type { StackOps } from './ipcHandlers'

export type MockScenario = 'normal' | 'empty' | 'no-config' | 'docker-off'

/**
 * WTMB_MOCK=1 stand-in for the git/docker layer: the design prototype's demo
 * dataset with timed starting…/stopping… transitions. WTMB_SCENARIO forces
 * the empty / no-config / docker-off states (screenshots flip it live).
 */
export class MockBackend implements StackOps {
  scenario: MockScenario
  private statuses: Record<string, StackStatus> = { ...MOCK_STATUSES }
  private promoted = new Set<string>()
  private labels = new Map(makeMockWorktrees({}).map((w) => [w.id, w.label]))
  private timers: ReturnType<typeof setTimeout>[] = []

  constructor(
    scenario: MockScenario,
    private onOpDone: (result: OpResult) => void,
    private onChange: () => void
  ) {
    this.scenario = scenario
  }

  scan(): { worktrees: WorktreeSnapshot[]; dockerRunning: boolean } {
    if (this.scenario === 'empty' || this.scenario === 'no-config') {
      return { worktrees: [], dockerRunning: true }
    }
    if (this.scenario === 'docker-off') {
      const stopped = Object.fromEntries(Object.keys(this.statuses).map((id) => [id, 'stopped']))
      return {
        worktrees: makeMockWorktrees(stopped as Record<string, StackStatus>, this.promoted),
        dockerRunning: false
      }
    }
    return { worktrees: makeMockWorktrees(this.statuses, this.promoted), dockerRunning: true }
  }

  start(id: string): void {
    this.transition(id, 'starting', 'running', 1400, (label) => ({
      id,
      kind: 'start',
      ok: true,
      message: `${label} is up`
    }))
  }

  stop(id: string): void {
    this.transition(id, 'stopping', 'stopped', 1000, (label) => ({
      id,
      kind: 'stop',
      ok: true,
      message: `${label} stopped`
    }))
  }

  destroy(id: string): void {
    this.transition(id, 'stopping', 'stopped', 1200, (label) => ({
      id,
      kind: 'destroy',
      ok: true,
      message: `Destroyed ${label} — stack, volumes & worktree removed`
    }))
  }

  promote(id: string): void {
    if (this.promoted.has(id)) return
    this.statuses[id] = 'promoting'
    this.onChange()
    this.timers.push(
      setTimeout(() => {
        this.promoted.add(id)
        this.statuses[id] = 'running'
        this.onOpDone({
          id,
          kind: 'promote',
          ok: true,
          message: `${this.labels.get(id) ?? id} promoted`
        })
        this.onChange()
      }, 2400)
    )
  }

  editorPath(): string | null {
    return null // nothing real to open in mock mode
  }

  dispose(): void {
    this.timers.forEach(clearTimeout)
  }

  private transition(
    id: string,
    during: StackStatus,
    after: StackStatus,
    ms: number,
    result: (label: string) => OpResult
  ): void {
    if (!(id in this.statuses)) return
    this.statuses[id] = during
    this.onChange()
    this.timers.push(
      setTimeout(() => {
        this.statuses[id] = after
        this.onOpDone(result(this.labels.get(id) ?? id))
        this.onChange()
      }, ms)
    )
  }
}

/** In-memory ConfigStore twin so mock runs never touch ~/.config. */
export class MockConfigStore implements ConfigSource {
  state: ConfigState
  error: string | null = null
  private data: Config = structuredClone(MOCK_CONFIG)

  constructor(scenario: MockScenario) {
    this.state = scenario === 'no-config' ? 'missing' : 'ok'
  }

  get(): Config {
    return this.data
  }

  reload(): void {
    // in-memory — nothing to reload from disk
  }

  createDefault(): void {
    this.state = 'ok'
  }

  patch(p: Partial<Config>): void {
    this.data = { ...this.data, ...p }
  }
}
