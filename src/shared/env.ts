import type { ExtraPort } from './types'

/**
 * Minimal .env parser: KEY=VALUE lines, ignores comments/blank lines and
 * `export ` prefixes, strips matching single/double quotes and inline
 * comments on unquoted values. Later keys win.
 */
export function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    let value = m[2].trim()
    const quoted = /^(['"])(.*)\1$/.exec(value)
    if (quoted) {
      value = quoted[2]
    } else {
      const hash = value.indexOf(' #')
      if (hash !== -1) value = value.slice(0, hash).trim()
    }
    out[m[1]] = value
  }
  return out
}

/** A port is a 1–65535 integer; anything else means "no port configured". */
export function portFrom(env: Record<string, string>, key: string): number | null {
  const raw = env[key]
  if (raw == null || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return n >= 1 && n <= 65535 ? n : null
}

/** Extra port chips in config order, labeled by key minus a _PORT suffix. */
export function extraPorts(env: Record<string, string>, keys: string[]): ExtraPort[] {
  const out: ExtraPort[] = []
  for (const key of keys) {
    const port = portFrom(env, key)
    if (port != null) out.push({ key: key.replace(/_?PORT$/i, '').toLowerCase() || key, port })
  }
  return out
}
