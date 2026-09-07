import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Poller } from '../poller'

describe('Poller.refresh', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('re-polls after the in-flight poll when a refresh arrives mid-scan', async () => {
    let resolveFirst: () => void = () => {}
    let calls = 0
    const poller = new Poller(
      () => {
        calls++
        if (calls === 1) return new Promise<void>((r) => (resolveFirst = r))
        return Promise.resolve()
      },
      () => 10_000,
      () => {}
    )
    poller.start()
    expect(calls).toBe(1)

    poller.refresh() // dropped before the fix; now queued
    expect(calls).toBe(1)

    resolveFirst()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toBe(2)
    poller.stop()
  })

  it('polls immediately when idle', async () => {
    let calls = 0
    const poller = new Poller(
      async () => {
        calls++
      },
      () => 10_000,
      () => {}
    )
    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    poller.refresh()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toBe(2)
    poller.stop()
  })
})
