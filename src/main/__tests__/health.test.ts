import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTracker, probeHealth, UNHEALTHY_AFTER_MS, withHealth } from '../health'

describe('withHealth', () => {
  it("demotes an unhealthy 'running' stack to 'starting'", () => {
    expect(withHealth('running', false)).toBe('starting')
  })

  it("keeps a healthy 'running' stack running", () => {
    expect(withHealth('running', true)).toBe('running')
  })

  it("flips to 'unhealthy' once the probe has failed for the grace period", () => {
    const t0 = 1_000_000
    expect(withHealth('running', false, t0, t0 + UNHEALTHY_AFTER_MS - 1)).toBe('starting')
    expect(withHealth('running', false, t0, t0 + UNHEALTHY_AFTER_MS)).toBe('unhealthy')
  })

  it('passes every other status through regardless of health', () => {
    for (const status of ['starting', 'stopping', 'stopped'] as const) {
      expect(withHealth(status, false)).toBe(status)
      expect(withHealth(status, true)).toBe(status)
    }
  })
})

describe('probeHealth', () => {
  let server: Server | null = null

  const listen = (statusCode: number): Promise<number> =>
    new Promise((resolve) => {
      server = createServer((_req, res) => {
        res.statusCode = statusCode
        res.end('{}')
      })
      server.listen(0, '127.0.0.1', () => {
        resolve((server!.address() as { port: number }).port)
      })
    })

  afterEach(() => {
    server?.close()
    server = null
  })

  it('is healthy on a 2xx', async () => {
    const port = await listen(200)
    expect(await probeHealth(port, '/api/configs')).toEqual({ ok: true, detail: null })
  })

  it('is unhealthy on a 5xx (API up but broken)', async () => {
    const port = await listen(500)
    expect(await probeHealth(port, '/api/configs')).toEqual({ ok: false, detail: 'HTTP 500' })
  })

  it('is unhealthy when nothing is listening', async () => {
    const port = await listen(200)
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = null
    expect(await probeHealth(port, '/api/configs')).toEqual({ ok: false, detail: 'no response' })
  })
})

describe('HealthTracker', () => {
  it('tracks the first failure and turns it unhealthy after the grace period', () => {
    const tr = new HealthTracker()
    const fail = { ok: false, detail: 'HTTP 500' }
    expect(tr.apply('a', 'running', fail, 0)).toEqual({ status: 'starting', detail: 'HTTP 500' })
    expect(tr.apply('a', 'running', fail, UNHEALTHY_AFTER_MS)).toEqual({
      status: 'unhealthy',
      detail: 'HTTP 500'
    })
  })

  it('resets when the probe passes or the stack is not running', () => {
    const tr = new HealthTracker()
    const fail = { ok: false, detail: 'no response' }
    tr.apply('a', 'running', fail, 0)
    expect(tr.apply('a', 'running', { ok: true, detail: null }, 10)).toEqual({
      status: 'running',
      detail: null
    })
    expect(tr.apply('a', 'running', fail, UNHEALTHY_AFTER_MS + 20).status).toBe('starting')
    tr.apply('a', 'stopped', null, UNHEALTHY_AFTER_MS + 30)
    expect(tr.apply('a', 'running', fail, 3 * UNHEALTHY_AFTER_MS).status).toBe('starting')
  })
})
