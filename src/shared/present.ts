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

/** Ticket label from a branch name, e.g. "feature/MDW-214-checkout-totals" →
 *  "MDW-214". Falls back to the branch itself when nothing ticket-shaped. */
export function ticketFrom(branch: string): string {
  const m = /([A-Za-z][A-Za-z0-9]+)-(\d{1,6})(?![\d])/.exec(branch)
  return m ? `${m[1].toUpperCase()}-${m[2]}` : branch
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
