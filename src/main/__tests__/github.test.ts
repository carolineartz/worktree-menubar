import { describe, expect, it } from 'vitest'
import { prInfoFrom } from '../github'

describe('prInfoFrom', () => {
  it('returns null when gh found no PR', () => {
    expect(prInfoFrom({})).toBeNull()
  })

  it('labels an open PR and leaves merged off', () => {
    expect(prInfoFrom({ url: 'u', number: 12, state: 'OPEN' })).toEqual({
      url: 'u',
      label: 'PR #12 · open',
      merged: false
    })
  })

  it('prefers draft over open', () => {
    expect(prInfoFrom({ url: 'u', number: 3, state: 'OPEN', isDraft: true })?.label).toBe(
      'PR #3 · draft'
    )
  })

  it('flags a merged PR and names the base branch', () => {
    const info = prInfoFrom({
      url: 'u',
      number: 7,
      state: 'MERGED',
      mergedAt: '2026-09-01T00:00:00Z',
      baseRefName: 'main'
    })
    expect(info).toEqual({ url: 'u', label: 'PR #7 · merged into main', merged: true })
  })

  it('treats a closed, unmerged PR as not merged', () => {
    expect(prInfoFrom({ url: 'u', number: 9, state: 'CLOSED', mergedAt: null })).toEqual({
      url: 'u',
      label: 'PR #9 · closed',
      merged: false
    })
  })
})
