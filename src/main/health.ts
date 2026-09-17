import type { StackStatus } from '../shared/types'

export interface HealthProbe {
  ok: boolean
  /** short reason when !ok, e.g. "HTTP 500", "no response" */
  detail: string | null
}

/**
 * GET http://127.0.0.1:<port><path> — healthy only on a real 2xx. The
 * Accept header matters: dev servers happily serve the app's error shell
 * as 200 for HTML requests while the API behind them is still booting.
 */
export async function probeHealth(
  port: number,
  path: string,
  timeoutMs = 2500
): Promise<HealthProbe> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      signal: ctl.signal,
      headers: { Accept: 'application/json' }
    })
    void res.body?.cancel()
    return { ok: res.ok, detail: res.ok ? null : `HTTP ${res.status}` }
  } catch {
    return { ok: false, detail: 'no response' }
  } finally {
    clearTimeout(timer)
  }
}

/** How long a compose-running stack may fail the probe before it's 'unhealthy'
 *  rather than 'starting' — rails boot + vite compile fit inside this. */
export const UNHEALTHY_AFTER_MS = 2 * 60_000

/**
 * Containers up ≠ app serving. A compose-'running' stack that fails the
 * health probe is 'starting' (rails boot, migrations, vite compile…) until
 * it has failed continuously for UNHEALTHY_AFTER_MS, then 'unhealthy' — a
 * dead API, a lost DB volume, a missing container. Every other status passes
 * through untouched. failingSince is when the probe first failed (null =
 * this is the first failure).
 */
export function withHealth(
  status: StackStatus,
  healthy: boolean,
  failingSince: number | null = null,
  now = Date.now()
): StackStatus {
  if (status !== 'running' || healthy) return status
  return failingSince != null && now - failingSince >= UNHEALTHY_AFTER_MS ? 'unhealthy' : 'starting'
}

/** Remembers, per stack, when the probe started failing. */
export class HealthTracker {
  private failingSince = new Map<string, number>()

  /** Fold a probe result in; returns the display status + reason. */
  apply(
    id: string,
    base: StackStatus,
    probe: HealthProbe | null,
    now = Date.now()
  ): { status: StackStatus; detail: string | null } {
    if (base !== 'running' || !probe || probe.ok) {
      this.failingSince.delete(id)
      return { status: base, detail: null }
    }
    const since = this.failingSince.get(id) ?? now
    this.failingSince.set(id, since)
    return { status: withHealth(base, false, since, now), detail: probe.detail }
  }
}
