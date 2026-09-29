import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import type { ClaudeMode, Config } from '../shared/types'

/**
 * Claude Code's transcript folder for a working directory: the absolute path
 * with every non-alphanumeric character replaced by '-'.
 */
export function claudeProjectDir(path: string, home = homedir()): string {
  const root = process.env.CLAUDE_CONFIG_DIR || join(home, '.claude')
  return join(root, 'projects', path.replace(/[^a-zA-Z0-9]/g, '-'))
}

/** Top-level session transcripts only — subagent transcripts live in subfolders. */
export async function countClaudeSessions(path: string): Promise<number> {
  try {
    const entries = await readdir(claudeProjectDir(path))
    return entries.filter((f) => f.endsWith('.jsonl')).length
  } catch {
    return 0
  }
}

export function claudeInvocation(base: string, mode: ClaudeMode): string {
  return mode === 'resume' ? `${base} --resume` : base
}

const shellQuote = (s: string): string => `'${s.replaceAll("'", `'\\''`)}'`

/**
 * Self-deleting script for terminals that open a file. The command runs in an
 * interactive login shell so PATH and aliases from the user's rc files apply;
 * the window then stays on a shell in the worktree.
 */
export function launchScript(dir: string, command: string): string {
  return [
    '#!/bin/zsh',
    'rm -f -- "$0"',
    `cd -- ${shellQuote(dir)} || exit 1`,
    `"\${SHELL:-/bin/zsh}" -lic ${shellQuote(command)}`,
    'exec "${SHELL:-/bin/zsh}" -l',
    ''
  ].join('\n')
}

const WARP_TAB_CONFIG = join(homedir(), '.warp', 'tab_configs', 'worktree-menubar.toml')

/** JSON string escapes are valid TOML basic-string escapes. */
export function warpTabConfig(dir: string, command: string): string {
  return [
    'name = "Worktree Menubar · Claude"',
    `title = ${JSON.stringify(`${basename(dir)} · claude`)}`,
    '',
    '[[panes]]',
    'id = "claude"',
    'type = "terminal"',
    `directory = ${JSON.stringify(dir)}`,
    `commands = [${JSON.stringify(command)}]`,
    ''
  ].join('\n')
}

async function writeScript(dir: string, command: string): Promise<string> {
  const path = join(tmpdir(), `wtmb-claude-${randomUUID().slice(0, 8)}.command`)
  await writeFile(path, launchScript(dir, command), { mode: 0o755 })
  return path
}

/** Rejects with the command's stderr, which is what a pinned row error should show. */
function exec(file: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { cwd }, (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr.trim() || err.message))
      else resolve()
    })
  })
}

/** Open a new terminal window in `dir` running the Claude command. */
export async function launchClaude(
  dir: string,
  mode: ClaudeMode,
  cfg: Pick<Config, 'claudeCommand' | 'terminal' | 'terminalCommand'>
): Promise<void> {
  const command = claudeInvocation(cfg.claudeCommand.trim(), mode)
  switch (cfg.terminal) {
    case 'warp':
      await mkdir(dirname(WARP_TAB_CONFIG), { recursive: true })
      await writeFile(WARP_TAB_CONFIG, warpTabConfig(dir, command))
      return exec('open', ['warp://tab_config/worktree-menubar?new_window=true'])
    case 'custom': {
      const template = cfg.terminalCommand.trim()
      if (!template) throw new Error('Set a custom terminal command in Settings → Claude.')
      const script = template.includes('{script}') ? await writeScript(dir, command) : ''
      const line = template
        .replaceAll('{script}', JSON.stringify(script))
        .replaceAll('{path}', JSON.stringify(dir))
        .replaceAll('{command}', JSON.stringify(command))
      return exec('/bin/zsh', ['-lc', line], dir)
    }
    default:
      return exec('open', [
        '-a',
        cfg.terminal === 'iterm' ? 'iTerm' : 'Terminal',
        await writeScript(dir, command)
      ])
  }
}
