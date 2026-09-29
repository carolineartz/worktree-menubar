import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  claudeInvocation,
  claudeProjectDir,
  countClaudeSessions,
  launchScript,
  warpTabConfig
} from '../claude'

describe('claudeProjectDir', () => {
  it('replaces every non-alphanumeric character of the path with a dash', () => {
    expect(claudeProjectDir('/Users/me/Projects/core/.worktrees/CFE-3310', '/Users/me')).toBe(
      '/Users/me/.claude/projects/-Users-me-Projects-core--worktrees-CFE-3310'
    )
    expect(claudeProjectDir('/Users/me/My Repo/wt_1', '/Users/me')).toBe(
      '/Users/me/.claude/projects/-Users-me-My-Repo-wt-1'
    )
  })
})

describe('countClaudeSessions', () => {
  let home: string | null = null
  const prev = process.env.CLAUDE_CONFIG_DIR

  afterEach(() => {
    if (home) rmSync(home, { recursive: true, force: true })
    home = null
    if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = prev
  })

  it('counts top-level transcripts, not subagent folders or other files', async () => {
    home = mkdtempSync(join(tmpdir(), 'wtmb-claude-'))
    process.env.CLAUDE_CONFIG_DIR = home
    const dir = join(home, 'projects', '-wt-CFE-1')
    mkdirSync(join(dir, 'aaaa'), { recursive: true })
    writeFileSync(join(dir, 'aaaa.jsonl'), '')
    writeFileSync(join(dir, 'bbbb.jsonl'), '')
    writeFileSync(join(dir, 'aaaa', 'agent-1.jsonl'), '')
    writeFileSync(join(dir, 'notes.md'), '')
    expect(await countClaudeSessions('/wt/CFE-1')).toBe(2)
  })

  it('is 0 for a directory Claude has never run in', async () => {
    home = mkdtempSync(join(tmpdir(), 'wtmb-claude-'))
    process.env.CLAUDE_CONFIG_DIR = home
    expect(await countClaudeSessions('/wt/never')).toBe(0)
  })
})

describe('claudeInvocation', () => {
  it('adds --resume only for resume', () => {
    expect(claudeInvocation('claude', 'new')).toBe('claude')
    expect(claudeInvocation('claude --model opus', 'resume')).toBe('claude --model opus --resume')
  })
})

describe('launchScript', () => {
  it('deletes itself, cds with the path quoted, runs the command, then stays on a shell', () => {
    const script = launchScript("/wt/it's here", 'claude --resume')
    expect(script.split('\n')).toEqual([
      '#!/bin/zsh',
      'rm -f -- "$0"',
      "cd -- '/wt/it'\\''s here' || exit 1",
      `"\${SHELL:-/bin/zsh}" -lic 'claude --resume'`,
      'exec "${SHELL:-/bin/zsh}" -l',
      ''
    ])
  })
})

describe('warpTabConfig', () => {
  it('opens one terminal pane in the worktree running the command', () => {
    const toml = warpTabConfig('/wt/CFE-1', 'claude --resume')
    expect(toml).toContain('title = "CFE-1 · claude"')
    expect(toml).toContain('type = "terminal"')
    expect(toml).toContain('directory = "/wt/CFE-1"')
    expect(toml).toContain('commands = ["claude --resume"]')
  })

  it('escapes quotes in the path', () => {
    expect(warpTabConfig('/wt/a"b', 'claude')).toContain('directory = "/wt/a\\"b"')
  })
})
