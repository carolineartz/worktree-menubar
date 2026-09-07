import { jiraBrowseUrl } from './present'
import type { Config, StackStatus, WorktreeSnapshot } from './types'
import { DEFAULT_CONFIG } from './types'

/** The design prototype's demo dataset — repos meadow/lantern are fictional. */

export const MOCK_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  repos: ['~/dev/meadow', '~/dev/lantern'],
  urlTemplate: 'http://localhost:{port}/#/login',
  jiraBaseUrl: 'https://meadow.atlassian.net',
  promoteCommand: 'work {branch} --local --no-open'
}

export const MOCK_STATUSES: Record<string, StackStatus> = {
  'mdw-214': 'running',
  'mdw-231': 'running',
  'mdw-198': 'stopped',
  'mdw-247': 'stopped',
  'mdw-loc1': 'stopped',
  'ltn-87': 'running',
  'ltn-92': 'stopped',
  'ltn-101': 'stopped'
}

interface MockSeed {
  id: string
  repo: string
  label: string
  branch: string
  /** used once promoted for unserved seeds */
  port: number
  extras: { key: string; port: number }[]
  path: string
  served: boolean
  prUrl: string | null
  prLabel: string | null
  prMerged?: boolean
}

const SEEDS: MockSeed[] = [
  {
    id: 'mdw-214',
    repo: 'meadow',
    label: 'MDW-214',
    branch: 'feature/MDW-214-checkout-totals',
    port: 9002,
    extras: [
      { key: 'api', port: 3004 },
      { key: 'ws', port: 8084 },
      { key: 'db', port: 5436 }
    ],
    path: '~/dev/meadow-worktrees/MDW-214',
    served: true,
    prUrl: 'https://github.com/meadow/meadow/pull/4312',
    prLabel: 'PR #4312 · open'
  },
  {
    id: 'mdw-231',
    repo: 'meadow',
    label: 'MDW-231',
    branch: 'MDW-231/yarn4-transitive-hardening',
    port: 9003,
    extras: [
      { key: 'api', port: 3005 },
      { key: 'ws', port: 8085 },
      { key: 'db', port: 5437 }
    ],
    path: '~/dev/meadow-worktrees/MDW-231',
    served: true,
    prUrl: null,
    prLabel: null
  },
  {
    id: 'mdw-198',
    repo: 'meadow',
    label: 'MDW-198',
    branch: 'MDW-198/fix-login-redirect-loop',
    port: 9004,
    extras: [
      { key: 'api', port: 3006 },
      { key: 'ws', port: 8086 },
      { key: 'db', port: 5438 }
    ],
    path: '~/dev/meadow-worktrees/MDW-198',
    served: true,
    prUrl: 'https://github.com/meadow/meadow/pull/4297',
    prLabel: 'PR #4297 · merged into main',
    prMerged: true
  },
  {
    id: 'mdw-247',
    repo: 'meadow',
    label: 'MDW-247',
    branch: 'MDW-247/spike-virtualized-tables',
    port: 9005,
    extras: [
      { key: 'api', port: 3007 },
      { key: 'ws', port: 8087 },
      { key: 'db', port: 5439 }
    ],
    path: '~/dev/meadow-worktrees/MDW-247',
    served: false,
    prUrl: null,
    prLabel: null
  },
  {
    id: 'mdw-loc1',
    repo: 'meadow',
    label: 'fix-flaky-modal-tests',
    branch: 'fix-flaky-modal-tests',
    port: 9006,
    extras: [],
    path: '~/dev/meadow-worktrees/LOC-1',
    served: false,
    prUrl: 'https://github.com/meadow/meadow/pull/4330',
    prLabel: 'PR #4330 · draft'
  },
  {
    id: 'ltn-87',
    repo: 'lantern',
    label: 'LTN-87',
    branch: 'ltn-87/sso-settings-page',
    port: 9101,
    extras: [
      { key: 'api', port: 3101 },
      { key: 'db', port: 5501 }
    ],
    path: '~/dev/lantern-worktrees/LTN-87',
    served: true,
    prUrl: null,
    prLabel: null
  },
  {
    id: 'ltn-92',
    repo: 'lantern',
    label: 'LTN-92',
    branch: 'ltn-92/audit-log-export',
    port: 9102,
    extras: [
      { key: 'api', port: 3102 },
      { key: 'db', port: 5502 }
    ],
    path: '~/dev/lantern-worktrees/LTN-92',
    served: true,
    prUrl: 'https://github.com/lantern/lantern/pull/812',
    prLabel: 'PR #812 · open'
  },
  {
    id: 'ltn-101',
    repo: 'lantern',
    label: 'LTN-101',
    branch: 'ltn-101/webhook-retry-backoff',
    port: 9103,
    extras: [{ key: 'api', port: 3103 }],
    path: '~/dev/lantern-worktrees/LTN-101',
    served: false,
    prUrl: 'https://github.com/lantern/lantern/pull/799',
    prLabel: 'PR #799 · merged into main',
    prMerged: true
  }
]

/** promoted: unserved seeds flipped to served by a mock promote;
 *  destroyed: seeds removed by a mock destroy. */
export function makeMockWorktrees(
  statuses: Record<string, StackStatus>,
  promoted?: Set<string>,
  destroyed?: Set<string>
): WorktreeSnapshot[] {
  return SEEDS.filter((s) => !destroyed?.has(s.id)).map((s) => {
    const served = s.served || (promoted?.has(s.id) ?? false)
    return {
      id: s.id,
      repo: s.repo,
      label: s.label,
      branch: s.branch,
      port: served ? s.port : null,
      extras: served ? s.extras : [],
      path: s.path,
      status: statuses[s.id] ?? 'stopped',
      served,
      jiraUrl: jiraBrowseUrl(MOCK_CONFIG.jiraBaseUrl, s.branch),
      prUrl: s.prUrl,
      prLabel: s.prLabel,
      prMerged: s.prMerged ?? false
    }
  })
}
