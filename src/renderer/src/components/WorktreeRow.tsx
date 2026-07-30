import type { JSX, MouseEvent } from 'react'
import type { WorktreeSnapshot } from '../../../shared/types'
import {
  ChevronDown,
  Destroy,
  Editor,
  GitHub,
  Jira,
  OpenAction,
  OpenExternal,
  Start,
  StopSquare
} from './icons'

export interface RowActions {
  /** primary: toggle expand; ⌘-click opens the dev URL on running rows */
  rowClick(wt: WorktreeSnapshot, e: MouseEvent): void
  toggleExpand(id: string): void
  openUrl(wt: WorktreeSnapshot): void
  openEditor(wt: WorktreeSnapshot): void
  openJira(wt: WorktreeSnapshot): void
  openPr(wt: WorktreeSnapshot): void
  start(wt: WorktreeSnapshot): void
  stop(wt: WorktreeSnapshot): void
  /** run the configured promote command on an unserved worktree */
  promote(wt: WorktreeSnapshot): void
  /** open the typed DESTROY confirm */
  askConfirm(id: string): void
  cancelConfirm(): void
  confirm(wt: WorktreeSnapshot): void
  setConfirmText(text: string): void
}

/** Borderless icon action for the strip. Native title tooltips don't render
 *  in the frameless popover, so the label shows via a CSS [data-tip] tooltip. */
function IconAction({
  tip,
  className = 'iconbtn',
  disabled = false,
  onAct,
  children
}: {
  tip: string
  className?: string
  disabled?: boolean
  onAct: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      className={className}
      data-tip={tip}
      aria-label={tip}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onAct()
      }}
    >
      {children}
    </button>
  )
}

export function WorktreeRow({
  wt,
  expanded,
  confirming,
  confirmText,
  canPromote,
  jiraEnabled,
  actions
}: {
  wt: WorktreeSnapshot
  expanded: boolean
  confirming: boolean
  confirmText: string
  /** a promote command is configured — unserved rows get the Promote button */
  canPromote: boolean
  /** a Jira base URL is configured — rows show the Jira button (dimmed without a ticket key) */
  jiraEnabled: boolean
  actions: RowActions
}): JSX.Element {
  const isTransition =
    wt.status === 'starting' || wt.status === 'stopping' || wt.status === 'promoting'
  const isStopped = wt.status === 'stopped'
  const tone = isTransition ? 'transition' : !wt.served ? 'bare' : isStopped ? 'stopped' : 'running'

  return (
    <>
      <div
        className={['row', isStopped && wt.served && 'stopped', expanded && 'expanded']
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => actions.rowClick(wt, e)}
      >
        <span className={`dot ${tone}`} />
        <span className={`port ${tone}`}>{wt.port ?? '—'}</span>
        <div className="row-main">
          <div className="branch">{wt.branch}</div>
          <div className="meta">{wt.label}</div>
        </div>
        {wt.status === 'running' && (
          <button
            className="visit tip-right"
            data-tip="Open in browser · or ⌘-click the row"
            aria-label="Open in browser"
            onClick={(e) => {
              e.stopPropagation()
              actions.openUrl(wt)
            }}
          >
            <OpenExternal />
          </button>
        )}
        {isTransition && <span className="transition-pill">{wt.status}…</span>}
        {isStopped && wt.served && !expanded && (
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
        {isStopped && !wt.served && canPromote && !expanded && (
          <button
            className="promote-btn"
            title="Promote — set up ports & serve this worktree"
            onClick={(e) => {
              e.stopPropagation()
              actions.promote(wt)
            }}
          >
            ↑ Promote
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
          {wt.served && wt.port != null && (
            <div className="chips">
              <span className="chip fe">FE {wt.port}</span>
              {wt.extras.map((ex) => (
                <span key={ex.key} className="chip">
                  {ex.key} {ex.port}
                </span>
              ))}
            </div>
          )}
          <div className="wt-path">{wt.path}</div>
          <div className="strip">
            {!confirming ? (
              <>
                {wt.served && (
                  <IconAction
                    tip={wt.status === 'running' ? 'Open in browser' : 'Open in browser — not up'}
                    disabled={wt.status !== 'running'}
                    onAct={() => actions.openUrl(wt)}
                  >
                    <OpenAction />
                  </IconAction>
                )}
                <IconAction tip="Open in editor" onAct={() => actions.openEditor(wt)}>
                  <Editor />
                </IconAction>
                {wt.served && (
                  <IconAction
                    tip={isStopped ? 'Start' : 'Start — already running'}
                    className="iconbtn start"
                    disabled={!isStopped}
                    onAct={() => actions.start(wt)}
                  >
                    <Start />
                  </IconAction>
                )}
                {wt.served && (
                  <IconAction
                    tip={wt.status === 'running' ? 'Stop' : 'Stop — not running'}
                    className="iconbtn stop"
                    disabled={wt.status !== 'running'}
                    onAct={() => actions.stop(wt)}
                  >
                    <StopSquare />
                  </IconAction>
                )}
                {isStopped && !wt.served && canPromote && (
                  <button
                    className="ibtn promote"
                    title="Promote — set up ports & serve this worktree"
                    onClick={(e) => {
                      e.stopPropagation()
                      actions.promote(wt)
                    }}
                  >
                    ↑ Promote
                  </button>
                )}
                <span className="spacer" />
                {jiraEnabled && (
                  <IconAction
                    tip={wt.jiraUrl ? `Jira · ${wt.label}` : 'No ticket key in this branch'}
                    className="iconbtn tip-right"
                    disabled={!wt.jiraUrl}
                    onAct={() => actions.openJira(wt)}
                  >
                    <Jira />
                  </IconAction>
                )}
                <IconAction
                  tip={wt.prUrl ? (wt.prLabel ?? 'Pull request') : 'No PR for this branch yet'}
                  className="iconbtn tip-right"
                  disabled={!wt.prUrl}
                  onAct={() => actions.openPr(wt)}
                >
                  <GitHub />
                </IconAction>
                <IconAction
                  tip="Destroy worktree…"
                  className="iconbtn destroy tip-right"
                  onAct={() => actions.askConfirm(wt.id)}
                >
                  <Destroy />
                </IconAction>
              </>
            ) : (
              <>
                <input
                  className="tear-input"
                  placeholder="type DESTROY"
                  value={confirmText}
                  autoFocus
                  spellCheck={false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => actions.setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && confirmText.trim() === 'DESTROY') {
                      actions.confirm(wt)
                    }
                    if (e.key === 'Escape') {
                      e.stopPropagation() // Esc here cancels the confirm, not the popover
                      actions.cancelConfirm()
                    }
                  }}
                />
                <button
                  className="tear-do"
                  disabled={confirmText.trim() !== 'DESTROY'}
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.confirm(wt)
                  }}
                >
                  Destroy
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
