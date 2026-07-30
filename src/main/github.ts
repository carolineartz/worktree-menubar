import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

export interface PrInfo {
  url: string
  /** button tooltip, e.g. "PR #4312 · open" */
  label: string
}

interface CacheEntry {
  info: PrInfo | null
  at: number
}

/** A found PR's URL never changes — recheck rarely (state only feeds the tooltip). */
const HIT_TTL_MS = 10 * 60_000
/** No PR yet — recheck soon so a freshly opened PR shows up quickly. */
const MISS_TTL_MS = 90_000

/**
 * Resolves a branch's GitHub PR with `gh pr view` run inside the repo (gh
 * infers the repo from the origin remote — no config needed). Lookups are
 * cached per branch and refreshed in the background: `get()` never blocks a
 * poll, it returns what's known and schedules a fetch when stale; onUpdate
 * fires after a fetch changes what we know.
 */
export class PrLinks {
  private cache = new Map<string, CacheEntry>()
  private inFlight = new Set<string>()
  /** flipped when `gh` isn't installed — stops respawning a missing binary */
  private disabled = false

  constructor(private onUpdate: () => void) {}

  get(repoRoot: string, branch: string): PrInfo | null {
    if (this.disabled) return null
    const key = `${repoRoot}\0${branch}`
    const hit = this.cache.get(key)
    const ttl = hit?.info ? HIT_TTL_MS : MISS_TTL_MS
    if (!hit || Date.now() - hit.at > ttl) void this.fetch(key, repoRoot, branch)
    return hit?.info ?? null
  }

  private async fetch(key: string, repoRoot: string, branch: string): Promise<void> {
    if (this.inFlight.has(key)) return
    this.inFlight.add(key)
    let info: PrInfo | null = null
    try {
      const { stdout } = await run('gh', ['pr', 'view', branch, '--json', 'url,number,state'], {
        cwd: repoRoot,
        timeout: 15_000
      })
      const pr = JSON.parse(stdout) as { url?: string; number?: number; state?: string }
      if (pr.url) {
        info = { url: pr.url, label: `PR #${pr.number} · ${(pr.state ?? '').toLowerCase()}` }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') this.disabled = true
      // anything else (no PR for the branch, gh unauthenticated, offline) → no button
    } finally {
      this.inFlight.delete(key)
    }
    const before = this.cache.get(key)?.info ?? null
    this.cache.set(key, { info, at: Date.now() })
    if ((before?.url ?? null) !== (info?.url ?? null) || before?.label !== info?.label) {
      this.onUpdate()
    }
  }
}
