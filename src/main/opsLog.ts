import { app } from 'electron'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Append-only record of every start/stop/destroy/promote command with its
 * full output — the "why did that fail?" trail. Lives in the standard macOS
 * log folder (~/Library/Logs/worktree-menubar/ops.log) so Console.app and
 * the row's "Open log" button both find it.
 */
export function opsLogPath(): string {
  return join(app.getPath('logs'), 'ops.log')
}

export function logOp(label: string, lines: string[]): void {
  const stamp = new Date().toISOString()
  const body = lines.map((l) => `  ${l}`).join('\n')
  const path = opsLogPath()
  void mkdir(join(path, '..'), { recursive: true })
    .then(() => appendFile(path, `${stamp} ${label}\n${body}\n`))
    .catch(() => {})
}
