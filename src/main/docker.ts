import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseComposeLs } from '../shared/compose'
import type { OpResult, StackStatus } from '../shared/types'

const run = promisify(execFile)

export interface DestroyTarget {
  /** absolute worktree dir */
  dir: string
  /** absolute repo root — `git worktree remove/prune` run here */
  repoRoot: string
  label: string
  /** false for unserved worktrees — nothing composed, skip the docker step */
  hasStack: boolean
  /** null when detached — nothing to delete */
  branch: string | null
  composeProject: string
  deleteBranch: boolean
}

/** first stderr line of a failed execFile, trimmed of git's "fatal: " prefix */
function stderrOf(err: unknown): string {
  const e = err as { stderr?: string }
  return (e.stderr ?? '')
    .split('\n')[0]
    .replace(/^(fatal|error): /, '')
    .trim()
}

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

  /**
   * Full cleanup: `down -v --remove-orphans`, then `git worktree remove --force`
   * + prune, optionally `git branch -D`. Force is deliberate — typing DESTROY is
   * the confirmation, and real worktrees always carry untracked files
   * (.husky/_, .env, node_modules) that make the non-force remove refuse.
   * A failed docker down doesn't abort: the worktree still goes, and the
   * message says which compose project to clean up by hand.
   */
  destroy(id: string, opts: DestroyTarget): void {
    if (this.pending.has(id)) return
    this.pending.set(id, 'stopping')
    void this.destroyAsync(id, opts)
      .then((result) => this.onOpDone(result))
      .finally(() => this.pending.delete(id))
  }

  private async destroyAsync(
    id: string,
    { dir, repoRoot, label, hasStack, branch, composeProject, deleteBranch }: DestroyTarget
  ): Promise<OpResult> {
    const notes: string[] = []

    if (hasStack) {
      try {
        await run('docker', ['compose', '-p', composeProject, 'down', '-v', '--remove-orphans'], {
          cwd: dir,
          timeout: 180_000
        })
      } catch {
        notes.push(`docker down failed — run \`docker compose -p ${composeProject} down -v\``)
      }
    }

    try {
      // twice: also unlocks a locked worktree
      await run('git', ['-C', repoRoot, 'worktree', 'remove', '--force', '--force', dir], {
        timeout: 60_000
      })
    } catch (err) {
      const detail = stderrOf(err)
      return {
        id,
        kind: 'destroy',
        ok: false,
        message: `${label}: worktree remove failed${detail ? ` — ${detail}` : ''}`
      }
    }
    await run('git', ['-C', repoRoot, 'worktree', 'prune'], { timeout: 15_000 }).catch(() => {})

    let removed = hasStack ? 'stack, volumes & worktree removed' : 'worktree removed'
    if (deleteBranch && branch) {
      try {
        await run('git', ['-C', repoRoot, 'branch', '-D', branch], { timeout: 15_000 })
        removed += ', branch deleted'
      } catch (err) {
        notes.push(`branch kept — ${stderrOf(err) || 'git branch -D failed'}`)
      }
    }

    return {
      id,
      kind: 'destroy',
      ok: true,
      message: `Destroyed ${label} — ${removed}${notes.length ? ` (${notes.join('; ')})` : ''}`
    }
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
