import { describe, expect, it } from 'vitest'
import { parsePorcelain } from '../worktrees'

const PORCELAIN = `worktree /Users/me/dev/meadow
HEAD 1234567890abcdef1234567890abcdef12345678
branch refs/heads/main

worktree /Users/me/dev/meadow-worktrees/MDW-214
HEAD 234567890abcdef1234567890abcdef123456789
branch refs/heads/feature/MDW-214-checkout-totals

worktree /Users/me/dev/meadow-worktrees/detached
HEAD 34567890abcdef1234567890abcdef1234567890
detached
`

describe('parsePorcelain', () => {
  it('parses paths and branches, marking the first entry as main', () => {
    const wts = parsePorcelain(PORCELAIN)
    expect(wts).toHaveLength(3)
    expect(wts[0]).toEqual({ path: '/Users/me/dev/meadow', branch: 'main', isMain: true })
    expect(wts[1]).toEqual({
      path: '/Users/me/dev/meadow-worktrees/MDW-214',
      branch: 'feature/MDW-214-checkout-totals',
      isMain: false
    })
    expect(wts[2].branch).toBeNull() // detached HEAD
  })

  it('skips bare entries but keeps the first real worktree as main', () => {
    const wts = parsePorcelain(
      'worktree /repos/x.git\nbare\n\nworktree /repos/x\nbranch refs/heads/main\n'
    )
    expect(wts).toHaveLength(1)
    expect(wts[0].isMain).toBe(true)
  })

  it('handles empty output', () => {
    expect(parsePorcelain('')).toEqual([])
  })
})
