import type { JSX } from 'react'
import { repoTint } from '../../../shared/present'
import type { WorktreeSnapshot } from '../../../shared/types'
import { WorktreeRow, type RowActions, type ConfirmKind } from './WorktreeRow'

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

export function WorktreeList({
  worktrees,
  expandedId,
  confirmingId,
  confirmKind,
  confirmText,
  actions
}: {
  worktrees: WorktreeSnapshot[]
  expandedId: string | null
  confirmingId: string | null
  confirmKind: ConfirmKind
  confirmText: string
  actions: RowActions
}): JSX.Element {
  return (
    <div className="list">
      <div className="list-inner">
        {groupByRepo(worktrees).map((g) => {
          const running = g.rows.filter((r) => r.status === 'running').length
          return (
            <div key={g.name}>
              <div className="group-header">
                <span className="gname" style={{ color: repoTint(g.name) }}>
                  {g.name}
                </span>
                <span className="gcount">
                  {running}/{g.rows.length}
                </span>
                <span className="grule" />
              </div>
              {g.rows.map((wt) => (
                <WorktreeRow
                  key={wt.id}
                  wt={wt}
                  expanded={expandedId === wt.id}
                  confirming={confirmingId === wt.id}
                  confirmKind={confirmKind}
                  confirmText={confirmText}
                  actions={actions}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
