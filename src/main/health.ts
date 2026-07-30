import type { StackStatus } from '../shared/types'

/**
 * GET http://127.0.0.1:<port><path> — healthy only on a real 2xx. The
 * Accept header matters: dev servers happily serve the app's error shell
 * as 200 for HTML requests while the API behind them is still booting.
 */
export async function probeHealth(port: number, path: string, timeoutMs = 2500): Promise<boolean> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      signal: ctl.signal,
      headers: { Accept: 'application/json' }
    })
    void res.body?.cancel()
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Containers up ≠ app serving. A compose-'running' stack that fails the
 * health probe is still 'starting' (rails boot, migrations, vite compile…);
 * every other status passes through untouched.
 */
export function withHealth(status: StackStatus, healthy: boolean): StackStatus {
  return status === 'running' && !healthy ? 'starting' : status
}
