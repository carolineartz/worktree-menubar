import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { defaultComposeProject } from '../shared/compose'
import { extraPorts, parseEnv, portFrom } from '../shared/env'
import { ticketFrom, tildePath } from '../shared/present'
import type { Config } from '../shared/types'

const run = promisify(execFile)

export interface ScannedWorktree {
  id: string
  repo: string
  label: string
  branch: string
  port: number
  extras: { key: string; port: number }[]
  path: string
  absPath: string
  composeProject: string
}

export interface GitWorktree {
  path: string
  branch: string | null
  isMain: boolean
}

/** Parse `git worktree list --porcelain` blocks. */
export function parsePorcelain(stdout: string): GitWorktree[] {
  const out: GitWorktree[] = []
  let cur: Partial<GitWorktree> & { bare?: boolean } = {}
  const flush = (): void => {
    if (cur.path && !cur.bare) {
      out.push({ path: cur.path, branch: cur.branch ?? null, isMain: out.length === 0 })
    }
    cur = {}
  }
  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (cur.path) flush()
      cur.path = line.slice('worktree '.length)
    } else if (line.startsWith('branch ')) {
      cur.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '')
    } else if (line === 'bare') {
      cur.bare = true
    }
  }
  if (cur.path) flush()
  return out
}

/**
 * Scan each configured repo's worktrees and keep the ones with a dev port
 * in their .env. The main checkout is skipped unless config says otherwise.
 */
export async function scanWorktrees(config: Config): Promise<ScannedWorktree[]> {
  const home = homedir()
  const results: ScannedWorktree[] = []

  for (const repoRoot of config.repos) {
    const abs = repoRoot.startsWith('~') ? join(home, repoRoot.slice(1)) : repoRoot
    let stdout: string
    try {
      ;({ stdout } = await run('git', ['worktree', 'list', '--porcelain'], { cwd: abs }))
    } catch {
      continue // not a repo / missing dir — skip silently, config UI shows the path
    }
    const repoName = basename(abs)

    for (const wt of parsePorcelain(stdout)) {
      if (wt.isMain && !config.includeMainCheckout) continue
      let env: Record<string, string>
      try {
        env = parseEnv(await readFile(join(wt.path, '.env'), 'utf8'))
      } catch {
        continue // no .env — skipped by design
      }
      const port = portFrom(env, config.devPortKey)
      if (port == null) continue

      const branch = wt.branch ?? basename(wt.path)
      results.push({
        id: wt.path,
        repo: repoName,
        label: ticketFrom(branch),
        branch,
        port,
        extras: extraPorts(env, config.extraPortKeys),
        path: tildePath(wt.path, home),
        absPath: wt.path,
        composeProject:
          env[config.composeProjectKey]?.trim() || defaultComposeProject(basename(wt.path))
      })
    }
  }
  return results
}
