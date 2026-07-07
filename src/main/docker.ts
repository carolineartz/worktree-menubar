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
 * Talks to `docker compose`. Start/stop/teardown are tracked as pending ops
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
  teardown(id: string, dir: string, label: string): void {
    this.exec(
      id,
      'teardown',
      'stopping',
      ['down', '-v'],
      dir,
      `Tore down ${label} — containers & volumes removed`,
      `${label} tear-down failed`
    )
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
