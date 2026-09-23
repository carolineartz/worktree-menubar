import { useRef, useState, type JSX, type MouseEvent } from 'react'
import { displayUrl, pillLabel } from '../../../shared/present'
import type { WorktreeSnapshot } from '../../../shared/types'
import {
  ChevronDown,
  Destroy,
  Editor,
  GitHub,
  Jira,
  Merge,
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
  /** the "also delete branch" checkbox in the confirm (default off) */
  setDeleteBranch(on: boolean): void
  /** clear the failure pinned under a row */
  dismissError(wt: WorktreeSnapshot): void
  /** reveal ops.log in Finder/Console */
  openOpsLog(): void
}

const KIND_VERB: Record<string, string> = {
  start: 'Start',
  stop: 'Stop',
  destroy: 'Destroy',
  promote: 'Promote'
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
  deleteBranch,
  canPromote,
  jiraEnabled,
  actions
}: {
  wt: WorktreeSnapshot
  expanded: boolean
  confirming: boolean
  confirmText: string
  deleteBranch: boolean
  /** a promote command is configured — unserved rows get the Promote button */
  canPromote: boolean
  /** a Jira base URL is configured — rows show the Jira button (dimmed without a ticket key) */
  jiraEnabled: boolean
  actions: RowActions
}): JSX.Element {
  const destroying = wt.status === 'destroying'
  const unhealthy = wt.status === 'unhealthy'
  const isTransition =
    wt.status === 'starting' || wt.status === 'stopping' || wt.status === 'promoting' || destroying
  const isStopped = wt.status === 'stopped'
  // containers are up in both cases — the app just isn't answering when unhealthy
  const isUp = wt.status === 'running' || unhealthy
  const tone = isTransition
    ? 'transition'
    : !wt.served
      ? 'bare'
      : isStopped
        ? 'stopped'
        : unhealthy
          ? 'unhealthy'
          : 'running'

  // Full branch name for a truncated one. Measured on hover so the tip only
  // exists when the ellipsis is actually showing; the CSS delay keeps it from
  // flashing on a pass-through.
  const branchRef = useRef<HTMLDivElement>(null)
  const [branchTip, setBranchTip] = useState<string | undefined>()
  const measureBranch = (): void => {
    const el = branchRef.current
    setBranchTip(el && el.scrollWidth > el.clientWidth ? wt.branch : undefined)
  }
  // same for a directory name too long for the pill
  const dirRef = useRef<HTMLSpanElement>(null)
  const [dirTip, setDirTip] = useState<string | undefined>()
  const measureDir = (): void => {
    const el = dirRef.current
    setDirTip(el && el.scrollWidth > el.clientWidth ? wt.dir : undefined)
  }

  return (
    <>
      <div
        className={[
          'row',
          isStopped && wt.served && 'stopped',
          expanded && !destroying && 'expanded',
          destroying && 'destroying'
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => {
          if (!destroying) actions.rowClick(wt, e)
        }}
      >
        {wt.prMerged && !isTransition ? (
          <span
            className={`dot merged ${tone}`}
            data-tip={`${wt.prLabel ?? 'PR merged'} — safe to destroy`}
          >
            <Merge />
          </span>
        ) : (
          <span className={`dot ${tone}`} />
        )}
        {/* the tip lives on the pill, the clipping on its text — an
            overflow:hidden element would clip its own ::after tooltip */}
        <span className={`port ${tone}`} data-tip={dirTip} onMouseEnter={measureDir}>
          <span className="port-text" ref={dirRef}>
            {pillLabel(wt.dir)}
          </span>
        </span>
        <div className="row-main" data-tip={branchTip} onMouseEnter={measureBranch}>
          <div className="branch" ref={branchRef}>
            {wt.branch}
          </div>
          <div className="meta">{wt.url ? displayUrl(wt.url) : 'not served'}</div>
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
        {isTransition && !destroying && (
          <span className="transition-pill tip-right" data-tip={wt.statusDetail ?? undefined}>
            {wt.status}…
          </span>
        )}
        {unhealthy && (
          <span
            className="transition-pill unhealthy tip-right"
            data-tip={wt.statusDetail ?? 'containers up, app not answering'}
          >
            unhealthy
          </span>
        )}
        {isStopped && wt.served && !expanded && (
          <button
            className="start-btn tip-right"
            data-tip="Start"
            aria-label="Start"
            onClick={(e) => {
              e.stopPropagation()
              actions.start(wt)
            }}
          >
            <Start />
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
        {destroying && (
          <div className="row-overlay" role="status" aria-live="polite">
            <span className="row-spin" />
            <span className="row-overlay-text">
              Destroying <b>{wt.label}</b>…
            </span>
          </div>
        )}
      </div>

      {wt.lastError && !destroying && (
        <div className="row-error" onClick={(e) => e.stopPropagation()}>
          <div className="row-error-head">
            <span className="row-error-title">
              {KIND_VERB[wt.lastError.kind] ?? wt.lastError.kind} failed
            </span>
            <span className="row-error-msg">{wt.lastError.message}</span>
          </div>
          {wt.lastError.detail && <pre className="row-error-detail">{wt.lastError.detail}</pre>}
          <div className="row-error-actions">
            <button className="tear-cancel" onClick={() => actions.openOpsLog()}>
              Open log
            </button>
            <button className="tear-cancel" onClick={() => actions.dismissError(wt)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {expanded && !destroying && (
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
                    tip={isUp ? 'Open in browser' : 'Open in browser — not up'}
                    disabled={!isUp}
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
                    tip={
                      isStopped
                        ? 'Start'
                        : unhealthy
                          ? 'Start — re-run up -d to recreate missing containers'
                          : 'Start — already running'
                    }
                    className="iconbtn start"
                    disabled={!isStopped && !unhealthy}
                    onAct={() => actions.start(wt)}
                  >
                    <Start />
                  </IconAction>
                )}
                {wt.served && (
                  <IconAction
                    tip={isUp ? 'Stop' : 'Stop — not running'}
                    className="iconbtn stop"
                    disabled={!isUp}
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
                  tip={wt.prMerged ? 'Destroy worktree… (PR merged)' : 'Destroy worktree…'}
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
                <label className="tear-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={deleteBranch}
                    onChange={(e) => actions.setDeleteBranch(e.target.checked)}
                  />
                  <span>+ branch</span>
                </label>
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
