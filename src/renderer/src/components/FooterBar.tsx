import type { JSX } from 'react'
import type { AppState } from '../../../shared/ipc'
import { Gear } from './icons'

export function FooterBar({
  state,
  onRefresh,
  onOpenSettings
}: {
  state: AppState
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
    text = `${running} / ${total} running`
  }

  return (
    <div className="footer">
      <span className={`foot-dot ${dot}`} />
      <span className="foot-text">{text}</span>
      <button className="foot-kbd" onClick={onRefresh} title="Refresh">
        ⌘R
      </button>
      <button className="foot-icon" onClick={onOpenSettings} title="Settings" aria-label="Settings">
        <Gear />
      </button>
    </div>
  )
}
