import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { probeHealth, withHealth } from '../health'

describe('withHealth', () => {
  it("demotes an unhealthy 'running' stack to 'starting'", () => {
    expect(withHealth('running', false)).toBe('starting')
  })

  it("keeps a healthy 'running' stack running", () => {
    expect(withHealth('running', true)).toBe('running')
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
    expect(await probeHealth(port, '/api/configs')).toBe(true)
  })

  it('is unhealthy on a 5xx (API up but broken)', async () => {
    const port = await listen(500)
    expect(await probeHealth(port, '/api/configs')).toBe(false)
  })

  it('is unhealthy when nothing is listening', async () => {
    const port = await listen(200)
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = null
    expect(await probeHealth(port, '/api/configs')).toBe(false)
  })
})
