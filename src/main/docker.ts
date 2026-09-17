import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseComposeLs } from '../shared/compose'
import { logOp } from './opsLog'
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

/** The tail of a failed execFile's stderr (git/docker put the reason last). */
function stderrOf(err: unknown, lines = 6): string {
  const e = err as { stderr?: string; message?: string; killed?: boolean }
  if (e.killed) return 'timed out'
  const out = (e.stderr ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (out.length === 0) return (e.message ?? '').split('\n')[0]
  return out
    .slice(-lines)
    .map((l) => l.replace(/^(fatal|error): /, ''))
    .join('\n')
}

const tail = (s: string, n = 20): string[] => s.split('\n').filter(Boolean).slice(-n)

/** Run a command, logging it and its output to ops.log; rethrows on failure. */
async function sh(
  label: string,
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeout: number }
): Promise<string> {
  const line = `$ ${cmd} ${args.join(' ')}${opts.cwd ? `   (in ${opts.cwd})` : ''}`
  try {
    const { stdout, stderr } = await run(cmd, args, opts)
    logOp(label, [line, ...tail(stderr || stdout)])
    return stdout
  } catch (err) {
    logOp(`${label} FAILED`, [line, ...tail((err as { stderr?: string }).stderr ?? String(err))])
    throw err
  }
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
  private pending = new Map<string, 'starting' | 'stopping' | 'destroying'>()

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

  /** the optimistic status of an in-flight op, if any (unserved rows use this alone) */
  pendingFor(id: string): StackStatus | null {
    return this.pending.get(id) ?? null
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
    this.pending.set(id, 'destroying')
    void this.destroyAsync(id, opts)
      .then((result) => this.onOpDone(result))
      .finally(() => this.pending.delete(id))
  }

  private async destroyAsync(
    id: string,
    { dir, repoRoot, label, hasStack, branch, composeProject, deleteBranch }: DestroyTarget
  ): Promise<OpResult> {
    const notes: string[] = []
    const fail = (message: string, detail: string): OpResult => ({
      id,
      kind: 'destroy',
      ok: false,
      message: `${label}: ${message}`,
      detail
    })

    if (hasStack) {
      try {
        await sh(
          `destroy ${label}`,
          'docker',
          ['compose', '-p', composeProject, 'down', '-v', '--remove-orphans'],
          {
            cwd: dir,
            timeout: 180_000
          }
        )
      } catch (err) {
        // keep going — the worktree can still be removed; say what's left behind
        notes.push(
          `docker down failed (${stderrOf(err, 1)}) — run: docker compose -p ${composeProject} down -v`
        )
      }
    }

    try {
      // --force twice: also unlocks a locked worktree
      await sh(
        `destroy ${label}`,
        'git',
        ['-C', repoRoot, 'worktree', 'remove', '--force', '--force', dir],
        {
          timeout: 60_000
        }
      )
    } catch (err) {
      const reason = stderrOf(err)
      if (!/not a working tree|is not a valid|does not exist/i.test(reason)) {
        return fail(
          'worktree remove failed',
          `${reason}\n\nUsually something is holding files open in the folder (an editor, a terminal, a container). Close it and try again, or run:\n  git -C ${repoRoot} worktree remove --force --force ${dir}`
        )
      }
      // git already forgot it (a half-finished earlier destroy) — prune is enough
      notes.push('git had already dropped the worktree')
    }
    await sh(`destroy ${label}`, 'git', ['-C', repoRoot, 'worktree', 'prune'], {
      timeout: 15_000
    }).catch(() => {})

    let removed = hasStack ? 'stack, volumes & worktree removed' : 'worktree removed'
    if (deleteBranch && branch) {
      try {
        await sh(`destroy ${label}`, 'git', ['-C', repoRoot, 'branch', '-D', branch], {
          timeout: 15_000
        })
        removed += ', branch deleted'
      } catch (err) {
        notes.push(`branch kept — ${stderrOf(err, 1) || 'git branch -D failed'}`)
      }
    }

    return {
      id,
      kind: 'destroy',
      ok: true,
      message: `Destroyed ${label} — ${removed}${notes.length ? ` (${notes.join('; ')})` : ''}`,
      detail: null
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
    sh(`${kind} ${dir}`, 'docker', ['compose', ...args], { cwd: dir, timeout: 180_000 })
      .then(() => this.onOpDone({ id, kind, ok: true, message: okMsg, detail: null }))
      .catch((err) =>
        this.onOpDone({
          id,
          kind,
          ok: false,
          message: failMsg,
          detail: `${stderrOf(err)}\n\nTo see the full output run in the worktree:\n  docker compose ${args.join(' ')}`
        })
      )
      .finally(() => this.pending.delete(id))
  }
}
