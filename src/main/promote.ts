import { execFile } from 'node:child_process'
import type { OpResult } from '../shared/types'
import { logOp } from './opsLog'

/**
 * Runs the configured promote command ({branch}/{path} placeholders) in a
 * login shell with the worktree as cwd — a `cutover-work`-style tool that
 * allocates ports, writes .env, creates the stack's external volumes and boots
 * it. Promote uses it to turn an unserved worktree into a served one; Start
 * uses it too, so a stack whose volumes or .env are missing gets them back
 * instead of failing in `docker compose up`. While it runs the row shows
 * 'promoting' / 'starting'; the poll after completion picks up the new state.
 */
const MESSAGES = {
  promote: (label: string, ok: boolean) => (ok ? `${label} promoted` : `${label} promote failed`),
  start: (label: string, ok: boolean) => (ok ? `${label} is up` : `${label} failed to start`)
}

export class PromoteService {
  private pending = new Set<string>()

  constructor(private onOpDone: (result: OpResult) => void) {}

  isPromoting(id: string): boolean {
    return this.pending.has(id)
  }

  promote(
    id: string,
    dir: string,
    branch: string,
    label: string,
    template: string,
    kind: 'promote' | 'start' = 'promote'
  ): void {
    const cmd = template.trim()
    if (!cmd || this.pending.has(id)) return
    this.pending.add(id)
    const line = cmd
      .replaceAll('{branch}', JSON.stringify(branch))
      .replaceAll('{path}', JSON.stringify(dir))
    // login shell so GUI launches resolve the same PATH as the editor command;
    // first boots can install deps + wait for health, hence the long timeout
    execFile(
      '/bin/zsh',
      ['-lc', line],
      { cwd: dir, timeout: 20 * 60_000, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        this.pending.delete(id)
        logOp(`${kind} ${label}${err ? ' FAILED' : ''}`, [
          `$ ${line}   (in ${dir})`,
          ...`${stdout}\n${stderr}`.split('\n').filter(Boolean).slice(-30)
        ])
        const tail = (stderr || stdout).split('\n').filter(Boolean).slice(-6).join('\n')
        this.onOpDone({
          id,
          kind,
          ok: !err,
          message: MESSAGES[kind](label, !err),
          detail: err ? `${tail}\n\nRe-run in a terminal to see everything:\n  ${line}` : null
        })
      }
    )
  }
}
