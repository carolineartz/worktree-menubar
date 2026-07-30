import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

/** Dirs docker commonly lives in that launchd's minimal PATH lacks. */
const FALLBACK_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', `${homedir()}/.docker/bin`]

/**
 * GUI-launched apps inherit launchd's minimal PATH (/usr/bin:/bin:…), so
 * execFile('docker', …) fails with ENOENT and reads as "Docker not running"
 * even while stacks are up. Probe the user's login-shell PATH once at startup
 * and merge it in; if the probe fails, append the usual homebrew/docker dirs.
 * Merging (never replacing) keeps terminal-launch PATHs intact.
 */
export function fixGuiPath(): void {
  let probed: string[] = []
  try {
    probed = execFileSync('/bin/zsh', ['-lc', 'printf %s "$PATH"'], {
      timeout: 3_000,
      encoding: 'utf8'
    })
      .trim()
      .split(':')
      .filter(Boolean)
  } catch {
    probed = FALLBACK_DIRS
  }
  const current = (process.env.PATH ?? '').split(':').filter(Boolean)
  const missing = probed.filter((d) => !current.includes(d))
  process.env.PATH = [...current, ...missing].join(':')
}
