import type { JSX, MouseEvent } from 'react'
import type { WorktreeSnapshot } from '../../../shared/types'
import { ChevronDown, OpenExternal, Trash } from './icons'

/** `down` = docker compose down -v; `destroy` = down -v + remove worktree + prune. */
export type ConfirmKind = 'down' | 'destroy'

export interface RowActions {
  /** primary: toggle expand; ⌘-click opens the dev URL on running rows */
  rowClick(wt: WorktreeSnapshot, e: MouseEvent): void
  toggleExpand(id: string): void
  openUrl(wt: WorktreeSnapshot): void
  openEditor(wt: WorktreeSnapshot): void
  start(wt: WorktreeSnapshot): void
  stop(wt: WorktreeSnapshot): void
  /** open the typed confirm for a destructive op */
  askConfirm(id: string, kind: ConfirmKind): void
  cancelConfirm(): void
  confirm(wt: WorktreeSnapshot): void
  setConfirmText(text: string): void
}

export function WorktreeRow({
  wt,
  expanded,
  confirming,
  confirmKind,
  confirmText,
  actions
}: {
  wt: WorktreeSnapshot
  expanded: boolean
  confirming: boolean
  confirmKind: ConfirmKind
  confirmText: string
  actions: RowActions
}): JSX.Element {
  const isTransition = wt.status === 'starting' || wt.status === 'stopping'
  const isStopped = wt.status === 'stopped'
  const tone = isTransition ? 'transition' : isStopped ? 'stopped' : 'running'
  const confirmWord = confirmKind === 'destroy' ? 'DESTROY' : 'DOWN'
  const confirmLabel = confirmKind === 'destroy' ? 'Destroy' : 'Down'
  const confirmMod = confirmKind === 'down' ? ' neutral' : ''

  return (
    <>
      <div
        className={['row', isStopped && 'stopped', expanded && 'expanded']
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => actions.rowClick(wt, e)}
      >
        <span className={`dot ${tone}`} />
        <span className={`port ${tone}`}>{wt.port}</span>
        <div className="row-main">
          <div className="branch">{wt.branch}</div>
          <div className="meta">{wt.label}</div>
        </div>
        {wt.status === 'running' && (
          <button
            className="visit"
            title="Open in browser (or ⌘-click the row)"
            onClick={(e) => {
              e.stopPropagation()
              actions.openUrl(wt)
            }}
          >
            <OpenExternal />
          </button>
        )}
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
                <button
                  className="ibtn"
                  title="docker compose down -v (removes containers + volumes; keeps the worktree)"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.askConfirm(wt.id, 'down')
                  }}
                >
                  Down
                </button>
                <span className="spacer" />
                <button
                  className="destroy-btn"
                  title="Destroy — down -v, then remove the worktree & prune (keeps the branch)"
                  aria-label="Destroy worktree"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.askConfirm(wt.id, 'destroy')
                  }}
                >
                  <Trash />
                </button>
              </>
            ) : (
              <>
                <input
                  className={`tear-input${confirmMod}`}
                  placeholder={`type ${confirmWord}`}
                  value={confirmText}
                  autoFocus
                  spellCheck={false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => actions.setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && confirmText.trim() === confirmWord) {
                      actions.confirm(wt)
                    }
                    if (e.key === 'Escape') {
                      e.stopPropagation() // Esc here cancels the confirm, not the popover
                      actions.cancelConfirm()
                    }
                  }}
                />
                <button
                  className={`tear-do${confirmMod}`}
                  disabled={confirmText.trim() !== confirmWord}
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.confirm(wt)
                  }}
                >
                  {confirmLabel}
                </button>
                <button
                  className="tear-cancel"
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.cancelConfirm()
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
