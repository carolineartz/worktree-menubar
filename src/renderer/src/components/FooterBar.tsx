import type { JSX } from 'react'
import type { AppState } from '../../../shared/ipc'

export function FooterBar({
  state,
  now,
  onRefresh,
  onOpenSettings
}: {
  state: AppState
  now: number
  onRefresh: () => void
  onOpenSettings: () => void
}): JSX.Element {
  const running = state.worktrees.filter((w) => w.status === 'running').length
  const total = state.worktrees.length

  let dot: 'green' | 'hollow' | 'amber'
  let text: string
  if (state.configState === 'missing') {
    dot = 'hollow'
    text = 'No config'
  } else if (state.configState === 'error') {
    dot = 'amber'
    text = 'Config parse error'
  } else if (!state.dockerRunning) {
    dot = 'amber'
    text = 'Docker not running — stacks shown as stopped'
  } else {
    dot = running > 0 ? 'green' : 'hollow'
    const ago =
      state.lastRefreshAt == null
        ? null
        : Math.max(0, Math.floor((now - state.lastRefreshAt) / 1000))
    text =
      ago == null
        ? `${running} / ${total} running`
        : `${running} / ${total} running · refreshed ${ago}s ago`
  }

  return (
    <div className="footer">
      <span className={`foot-dot ${dot}`} />
      <span className="foot-text">{text}</span>
      <span className="foot-kbd">⌘R</span>
      <span className="foot-sep">·</span>
      <button className="foot-link" onClick={onRefresh}>
        Refresh
      </button>
      <button className="foot-link" onClick={onOpenSettings}>
        Settings
      </button>
    </div>
  )
}
