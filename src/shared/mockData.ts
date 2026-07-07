import type { Config, StackStatus, WorktreeSnapshot } from './types'
import { DEFAULT_CONFIG } from './types'

/** The design prototype's demo dataset — repos meadow/lantern are fictional. */

export const MOCK_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  repos: ['~/dev/meadow', '~/dev/lantern'],
  urlTemplate: 'http://localhost:{port}/#/login'
}

export const MOCK_STATUSES: Record<string, StackStatus> = {
  'mdw-214': 'running',
  'mdw-231': 'running',
  'mdw-198': 'stopped',
  'ltn-87': 'running',
  'ltn-92': 'stopped'
}

interface MockSeed {
  id: string
  repo: string
  label: string
  branch: string
  port: number
  extras: { key: string; port: number }[]
  path: string
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
    path: '~/dev/meadow-worktrees/MDW-214'
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
    path: '~/dev/meadow-worktrees/MDW-231'
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
    path: '~/dev/meadow-worktrees/MDW-198'
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
    path: '~/dev/lantern-worktrees/LTN-87'
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
    path: '~/dev/lantern-worktrees/LTN-92'
  }
]

export function makeMockWorktrees(statuses: Record<string, StackStatus>): WorktreeSnapshot[] {
  return SEEDS.map((s) => ({ ...s, status: statuses[s.id] ?? 'stopped' }))
}
