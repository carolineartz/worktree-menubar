import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseComposeLs } from '../shared/compose'
import type { OpResult, StackStatus } from '../shared/types'

const run = promisify(execFile)

export interface ComposeSnapshot {
  dockerRunning: boolean
  /** compose project name → has running containers */
  running: Map<string, boolean>
}

/**
 * Talks to `docker compose`. Start/stop/down/destroy are tracked as pending ops
 * so rows can show the optimistic starting…/stopping… state while the
 * command runs; the poll after completion confirms the real status.
 */
export class DockerService {
  private pending = new Map<string, 'starting' | 'stopping'>()

  constructor(private onOpDone: (result: OpResult) => void) {}

  async snapshot(): Promise<ComposeSnapshot> {
    try {
      const { stdout } = await run('docker', ['compose', 'ls', '--all', '--format', 'json'], {
        timeout: 10_000
      })
      return { dockerRunning: true, running: parseComposeLs(stdout) }
    } catch {
      return { dockerRunning: false, running: new Map() }
    }
  }

  statusFor(id: string, composeProject: string, snap: ComposeSnapshot): StackStatus {
    const pending = this.pending.get(id)
    if (pending) return pending
    if (!snap.dockerRunning) return 'stopped'
    return snap.running.get(composeProject) ? 'running' : 'stopped'
  }

  start(id: string, dir: string, label: string): void {
    this.exec(
      id,
      'start',
      'starting',
      ['up', '-d'],
      dir,
      `${label} is up`,
      `${label} failed to start`
    )
  }

  stop(id: string, dir: string, label: string): void {
    this.exec(id, 'stop', 'stopping', ['stop'], dir, `${label} stopped`, `${label} failed to stop`)
  }

  /** Removes containers + volumes. Never touches the worktree or branch. */
  down(id: string, dir: string, label: string): void {
    this.exec(
      id,
      'down',
      'stopping',
      ['down', '-v'],
      dir,
      `Brought down ${label} — containers & volumes removed`,
      `${label} down failed`
    )
  }

  /** Full cleanup: `down -v`, then `git worktree remove` + prune. Keeps the branch. */
  destroy(id: string, dir: string, repoRoot: string, label: string): void {
    if (this.pending.has(id)) return
    this.pending.set(id, 'stopping')
    execFile('docker', ['compose', 'down', '-v'], { cwd: dir, timeout: 180_000 }, (dErr) => {
      if (dErr) {
        this.pending.delete(id)
        this.onOpDone({ id, kind: 'destroy', ok: false, message: `${label}: docker down failed` })
        return
      }
      // Non-force: if the worktree has uncommitted changes, keep it and say so
      // rather than silently discarding work.
      execFile('git', ['-C', repoRoot, 'worktree', 'remove', dir], { timeout: 30_000 }, (gErr) => {
        if (gErr) {
          this.pending.delete(id)
          this.onOpDone({
            id,
            kind: 'destroy',
            ok: false,
            message: `${label}: stack removed, but worktree kept (uncommitted changes?) — remove it manually`
          })
          return
        }
        execFile('git', ['-C', repoRoot, 'worktree', 'prune'], { timeout: 15_000 }, () => {
          this.pending.delete(id)
          this.onOpDone({
            id,
            kind: 'destroy',
            ok: true,
            message: `Destroyed ${label} — stack, volumes & worktree removed`
          })
        })
      })
    })
  }

  private exec(
    id: string,
    kind: OpResult['kind'],
    optimistic: 'starting' | 'stopping',
    args: string[],
    dir: string,
    okMsg: string,
    failMsg: string
  ): void {
    if (this.pending.has(id)) return // one command per stack at a time
    this.pending.set(id, optimistic)
    execFile('docker', ['compose', ...args], { cwd: dir, timeout: 180_000 }, (err) => {
      this.pending.delete(id)
      this.onOpDone({ id, kind, ok: !err, message: err ? failMsg : okMsg })
    })
  }
}
