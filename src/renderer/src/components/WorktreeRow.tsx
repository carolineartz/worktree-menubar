import type { JSX } from 'react'
import type { WorktreeSnapshot } from '../../../shared/types'
import { ChevronDown } from './icons'

export interface RowActions {
  /** primary: open the dev URL (running rows) or toggle expand (stopped rows) */
  rowClick(wt: WorktreeSnapshot): void
  toggleExpand(id: string): void
  openUrl(wt: WorktreeSnapshot): void
  openEditor(wt: WorktreeSnapshot): void
  start(wt: WorktreeSnapshot): void
  stop(wt: WorktreeSnapshot): void
  askTeardown(id: string): void
  cancelTeardown(): void
  confirmTeardown(wt: WorktreeSnapshot): void
  setConfirmText(text: string): void
}

export function WorktreeRow({
  wt,
  expanded,
  confirming,
  confirmText,
  actions
}: {
  wt: WorktreeSnapshot
  expanded: boolean
  confirming: boolean
  confirmText: string
  actions: RowActions
}): JSX.Element {
  const isTransition = wt.status === 'starting' || wt.status === 'stopping'
  const isStopped = wt.status === 'stopped'
  const tone = isTransition ? 'transition' : isStopped ? 'stopped' : 'running'

  return (
    <>
      <div
        className={['row', isStopped && 'stopped', expanded && 'expanded']
          .filter(Boolean)
          .join(' ')}
        onClick={() => actions.rowClick(wt)}
      >
        <span className={`dot ${tone}`} />
        <span className={`port ${tone}`}>{wt.port}</span>
        <div className="row-main">
          <div className="branch">{wt.branch}</div>
          <div className="meta">{wt.label}</div>
        </div>
        {isTransition && (
          <span className="transition-pill">
            {wt.status === 'starting' ? 'starting…' : 'stopping…'}
          </span>
        )}
        {isStopped && !expanded && (
          <button
            className="start-btn"
            onClick={(e) => {
              e.stopPropagation()
              actions.start(wt)
            }}
          >
            ▶ Start
          </button>
        )}
        <button
          className={expanded ? 'chev chev-open' : 'chev'}
          onClick={(e) => {
            e.stopPropagation()
            actions.toggleExpand(wt.id)
          }}
        >
          <ChevronDown />
        </button>
      </div>

      {expanded && (
        <div className="inset">
          <div className="chips">
            <span className="chip fe">FE {wt.port}</span>
            {wt.extras.map((ex) => (
              <span key={ex.key} className="chip">
                {ex.key} {ex.port}
              </span>
            ))}
          </div>
          <div className="wt-path">{wt.path}</div>
          <div className="strip">
            {!confirming ? (
              <>
                <button
                  className="ibtn"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.openUrl(wt)
                  }}
                >
                  ↗ Open
                </button>
                <button
                  className="ibtn"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.openEditor(wt)
                  }}
                >
                  Editor
                </button>
                {wt.status === 'running' && (
                  <button
                    className="ibtn stop"
                    onClick={(e) => {
                      e.stopPropagation()
                      actions.stop(wt)
                    }}
                  >
                    ■ Stop
                  </button>
                )}
                {isStopped && (
                  <button
                    className="ibtn start"
                    onClick={(e) => {
                      e.stopPropagation()
                      actions.start(wt)
                    }}
                  >
                    ▶ Start
                  </button>
                )}
                <span className="spacer" />
                <button
                  className="tear-ask"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.askTeardown(wt.id)
                  }}
                >
                  Tear down
                </button>
              </>
            ) : (
              <>
                <input
                  className="tear-input"
                  placeholder="type TEARDOWN"
                  value={confirmText}
                  autoFocus
                  spellCheck={false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => actions.setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && confirmText.trim() === 'TEARDOWN') {
                      actions.confirmTeardown(wt)
                    }
                    if (e.key === 'Escape') {
                      e.stopPropagation() // Esc here cancels the confirm, not the popover
                      actions.cancelTeardown()
                    }
                  }}
                />
                <button
                  className="tear-do"
                  disabled={confirmText.trim() !== 'TEARDOWN'}
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.confirmTeardown(wt)
                  }}
                >
                  Tear down
                </button>
                <button
                  className="tear-cancel"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.cancelTeardown()
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
