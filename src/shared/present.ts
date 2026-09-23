/** Stable per-repo hue. Same recipe as pr-menubar's repoTint: blended with
 *  the meta-text color so tint never breaks contrast — a hue hint, not a link. */
export function repoHue(repo: string): number {
  let h = 0
  for (let i = 0; i < repo.length; i++) h = (h * 31 + repo.charCodeAt(i)) >>> 0
  return h % 360
}

export function repoTint(repo: string): string {
  return `color-mix(in oklab, var(--txt3) 45%, hsl(${repoHue(repo)} 75% 58%))`
}

/** Strict ticket key from a branch name, e.g. "feature/MDW-214-checkout-totals"
 *  → "MDW-214"; null when nothing ticket-shaped. */
export function ticketKey(branch: string): string | null {
  const m = /([A-Za-z][A-Za-z0-9]+)-(\d{1,6})(?![\d])/.exec(branch)
  return m ? `${m[1].toUpperCase()}-${m[2]}` : null
}

/** Ticket label for the meta line — falls back to the branch itself. */
export function ticketFrom(branch: string): string {
  return ticketKey(branch) ?? branch
}

/** "…atlassian.net" + "MDW-214/x" → "…atlassian.net/browse/MDW-214";
 *  null when the base is unset or the branch has no ticket key. */
export function jiraBrowseUrl(baseUrl: string, branch: string): string | null {
  const base = baseUrl.trim().replace(/\/+$/, '')
  const key = ticketKey(branch)
  return base && key ? `${base}/browse/${key}` : null
}

/** "/Users/me/dev/x" → "~/dev/x" for display. */
export function tildePath(absPath: string, home: string): string {
  return home && absPath.startsWith(home) ? `~${absPath.slice(home.length)}` : absPath
}

/** Fill the config's URL template: "http://localhost:{port}/#/login" + 9002. */
export function devUrl(template: string, port: number): string {
  return template.includes('{port}')
    ? template.replaceAll('{port}', String(port))
    : `http://localhost:${port}/`
}

/** Fill the config's hostname template: "http://{host}/#/login" + "rb-4047.localhost". */
export function hostUrl(template: string, host: string): string {
  return template.includes('{host}') ? template.replaceAll('{host}', host) : `http://${host}/`
}

/**
 * The URL to open for a worktree. A WORK_HOST (behind the shared Traefik
 * proxy on :80) is preferred when present — browsers scope cookies by
 * hostname, so the port URL is a separate, usually-logged-out cookie jar.
 * Falls back to the port template exactly as before when there's no host.
 */
export function worktreeUrl(
  wt: { port: number | null; host?: string | null },
  cfg: { urlTemplate: string; hostUrlTemplate: string }
): string | null {
  if (wt.host) return hostUrl(cfg.hostUrlTemplate, wt.host)
  return wt.port != null ? devUrl(cfg.urlTemplate, wt.port) : null
}

/** A URL as the row's subline shows it — no scheme, no path:
 *  "http://cfe-3466.localhost/#/login" → "cfe-3466.localhost". */
export function displayUrl(url: string): string {
  return url.replace(/^[a-z]+:\/\//i, '').replace(/[/?#].*$/, '')
}

/** The row pill's name for a worktree dir — ticketless dirs shortened the
 *  way `work` shortens their hostname: "NO-TICKET-3" → "NT-3". */
export function pillLabel(dir: string): string {
  return dir.replace(/^NO-TICKET-(?=\d)/, 'NT-')
}
