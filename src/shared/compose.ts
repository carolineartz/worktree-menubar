/**
 * Parse `docker compose ls --all --format json` output into
 * project name → has-running-containers. Compose has emitted both a JSON
 * array and (older versions) one JSON object per line; accept either.
 */
export function parseComposeLs(stdout: string): Map<string, boolean> {
  const projects = new Map<string, boolean>()
  const trimmed = stdout.trim()
  if (!trimmed) return projects

  let entries: { Name?: string; Status?: string }[] = []
  try {
    const parsed = JSON.parse(trimmed)
    entries = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    for (const line of trimmed.split('\n')) {
      try {
        entries.push(JSON.parse(line))
      } catch {
        // not JSON — skip
      }
    }
  }

  for (const e of entries) {
    if (!e?.Name) continue
    // Status looks like "running(3)", "exited(2)", "running(2), exited(1)"
    projects.set(e.Name, /\brunning\(/.test(e.Status ?? ''))
  }
  return projects
}

/** Compose's default project name: directory basename, lowercased, with
 *  anything outside [a-z0-9_-] dropped and a leading letter/number enforced. */
export function defaultComposeProject(dirName: string): string {
  return dirName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^[_-]+/, '')
}
