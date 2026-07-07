import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Config, ConfigState } from '../shared/types'
import { DEFAULT_CONFIG } from '../shared/types'

export const CONFIG_PATH = join(homedir(), '.config', 'worktree-menubar.json')

/** What the coordinator/IPC layer needs from a config store — lets the
 *  in-memory mock stand in for the real file-backed one. */
export interface ConfigSource {
  state: ConfigState
  error: string | null
  get(): Config
  reload(): void
  createDefault(): void
  patch(p: Partial<Config>): void
}

/**
 * The hand-editable JSON config at ~/.config/worktree-menubar.json.
 * Reloaded from disk on every poll so external edits are picked up;
 * missing file and parse errors surface as distinct popover states.
 */
export class ConfigStore implements ConfigSource {
  state: ConfigState = 'missing'
  error: string | null = null
  private data: Config = structuredClone(DEFAULT_CONFIG)

  constructor(private path = CONFIG_PATH) {
    this.reload()
  }

  get(): Config {
    return this.data
  }

  reload(): void {
    let raw: string
    try {
      raw = readFileSync(this.path, 'utf8')
    } catch {
      this.state = 'missing'
      this.error = null
      this.data = structuredClone(DEFAULT_CONFIG)
      return
    }
    try {
      const parsed = JSON.parse(raw) as Partial<Config>
      this.data = { ...DEFAULT_CONFIG, ...parsed }
      this.state = 'ok'
      this.error = null
    } catch (err) {
      this.state = 'error'
      this.error = err instanceof Error ? err.message : String(err)
      this.data = structuredClone(DEFAULT_CONFIG)
    }
  }

  /** Write a fresh default config (the popover's "Create config" button). */
  createDefault(): void {
    this.data = structuredClone(DEFAULT_CONFIG)
    this.save()
  }

  patch(p: Partial<Config>): void {
    this.data = { ...this.data, ...p }
    this.save()
  }

  private save(): void {
    const tmp = `${this.path}.tmp`
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(tmp, JSON.stringify(this.data, null, 2) + '\n')
    renameSync(tmp, this.path)
    this.state = 'ok'
    this.error = null
  }
}
