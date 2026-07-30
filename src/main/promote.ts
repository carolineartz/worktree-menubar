import { execFile } from 'node:child_process'
import type { OpResult } from '../shared/types'

/**
 * Runs the configured promote command ({branch}/{path} placeholders) to turn
 * an unserved worktree into a served one. The command runs in a login shell
 * with the worktree as cwd — a `cutover-work`-style tool that allocates ports,
 * writes .env and boots the stack fits here. While it runs the row shows
 * 'promoting'; the poll after completion picks up the new .env.
 */
export class PromoteService {
  private pending = new Set<string>()

  constructor(private onOpDone: (result: OpResult) => void) {}

  isPromoting(id: string): boolean {
    return this.pending.has(id)
  }

  promote(id: string, dir: string, branch: string, label: string, template: string): void {
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
      (err) => {
        this.pending.delete(id)
        this.onOpDone({
          id,
          kind: 'promote',
          ok: !err,
          message: err
            ? `${label} promote failed — run it in a terminal to see why`
            : `${label} promoted`
        })
      }
    )
  }
}
