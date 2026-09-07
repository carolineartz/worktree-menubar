import { useState, type JSX } from 'react'
import { repoTint } from '../../../shared/present'
import type { WorktreeSnapshot } from '../../../shared/types'
import { ChevronDown } from './icons'
import { WorktreeRow, type RowActions } from './WorktreeRow'

interface RepoGroup {
  name: string
  rows: WorktreeSnapshot[]
}

/** Group by repo, preserving scan order (repos in config order). */
function groupByRepo(worktrees: WorktreeSnapshot[]): RepoGroup[] {
  const groups: RepoGroup[] = []
  const byName = new Map<string, RepoGroup>()
  for (const wt of worktrees) {
    let g = byName.get(wt.repo)
    if (!g) {
      g = { name: wt.repo, rows: [] }
      byName.set(wt.repo, g)
      groups.push(g)
    }
    g.rows.push(wt)
  }
  return groups
}

interface RowProps {
  expandedId: string | null
  confirmingId: string | null
  confirmText: string
  deleteBranch: boolean
  canPromote: boolean
  jiraEnabled: boolean
  actions: RowActions
}

function rowsFor(rows: WorktreeSnapshot[], p: RowProps): JSX.Element[] {
  return rows.map((wt) => (
    <WorktreeRow
      key={wt.id}
      wt={wt}
      expanded={p.expandedId === wt.id}
      confirming={p.confirmingId === wt.id}
      confirmText={p.confirmText}
      deleteBranch={p.deleteBranch}
      canPromote={p.canPromote}
      jiraEnabled={p.jiraEnabled}
      actions={p.actions}
    />
  ))
}

/** Collapsed-by-default list of a repo's unserved worktrees. Stays open while
 *  one of its rows is expanded or mid-promote so it can't hide active work. */
function MoreSection({ rows, p }: { rows: WorktreeSnapshot[]; p: RowProps }): JSX.Element {
  const [open, setOpen] = useState(false)
  const pinned = rows.some((r) => r.id === p.expandedId || r.status === 'promoting')
  const isOpen = open || pinned
  return (
    <>
      <button className="more-toggle" onClick={() => setOpen(!isOpen)}>
        <span className={isOpen ? 'mchev open' : 'mchev'}>
          <ChevronDown />
        </span>
        <span className="mlabel">more</span>
        <span className="mcount">{rows.length}</span>
        <span className="mrule" />
      </button>
      {isOpen && rowsFor(rows, p)}
    </>
  )
}

export function WorktreeList({
  worktrees,
  expandedId,
  confirmingId,
  confirmText,
  deleteBranch,
  canPromote,
  jiraEnabled,
  actions
}: {
  worktrees: WorktreeSnapshot[]
  expandedId: string | null
  confirmingId: string | null
  confirmText: string
  deleteBranch: boolean
  canPromote: boolean
  jiraEnabled: boolean
  actions: RowActions
}): JSX.Element {
  const p: RowProps = {
    expandedId,
    confirmingId,
    confirmText,
    deleteBranch,
    canPromote,
    jiraEnabled,
    actions
  }
  return (
    <div className="list">
      <div className="list-inner">
        {groupByRepo(worktrees).map((g) => {
          const served = g.rows.filter((r) => r.served)
          const more = g.rows.filter((r) => !r.served)
          const running = served.filter((r) => r.status === 'running').length
          return (
            <div key={g.name}>
              <div className="group-header">
                <span className="gname" style={{ color: repoTint(g.name) }}>
                  {g.name}
                </span>
                {served.length > 0 && (
                  <span className="gcount">
                    {running}/{served.length}
                  </span>
                )}
                <span className="grule" />
              </div>
              {rowsFor(served, p)}
              {more.length > 0 && <MoreSection rows={more} p={p} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
