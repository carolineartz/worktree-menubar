/**
 * Polling scheduler: every refreshSeconds in the background, immediately on
 * popover open and manual refresh. One scan in flight at a time; transient
 * failures retry quickly instead of waiting a full cycle.
 */
export class Poller {
  private timer: ReturnType<typeof setTimeout> | null = null
  private inFlight = false
  private consecutiveErrors = 0

  constructor(
    private pollFn: () => Promise<void>,
    private intervalMs: () => number,
    private onError: (err: unknown) => void
  ) {}

  start(): void {
    void this.poll()
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  /** Immediate poll (popover opened / ⌘R / settings changed). */
  refresh(): void {
    void this.poll()
  }

  private schedule(): void {
    this.stop()
    const base = Math.max(3000, this.intervalMs())
    const delay = this.consecutiveErrors > 0 ? Math.min(2000 * this.consecutiveErrors, base) : base
    this.timer = setTimeout(() => void this.poll(), delay)
  }

  private async poll(): Promise<void> {
    if (this.inFlight) return
    this.inFlight = true
    try {
      await this.pollFn()
      this.consecutiveErrors = 0
    } catch (err) {
      this.consecutiveErrors++
      this.onError(err)
    } finally {
      this.inFlight = false
      this.schedule()
    }
  }
}
