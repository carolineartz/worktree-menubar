import { describe, expect, it } from 'vitest'
import {
  devUrl,
  hostUrl,
  jiraBrowseUrl,
  repoHue,
  repoTint,
  ticketFrom,
  ticketKey,
  tildePath,
  worktreeUrl
} from '../present'

describe('ticketFrom', () => {
  it.each([
    ['feature/MDW-214-checkout-totals', 'MDW-214'],
    ['MDW-231/yarn4-transitive-hardening', 'MDW-231'],
    ['ltn-87/sso-settings-page', 'LTN-87'],
    ['fix/[ABC-42] flaky test', 'ABC-42'],
    ['plain-branch-name', 'plain-branch-name'], // nothing ticket-shaped
    ['main', 'main']
  ])('%s → %s', (branch, label) => {
    expect(ticketFrom(branch)).toBe(label)
  })
})

describe('ticketKey', () => {
  it('extracts and uppercases a ticket key', () => {
    expect(ticketKey('cfe-3310/focus-fix')).toBe('CFE-3310')
  })

  it('is null when nothing ticket-shaped', () => {
    expect(ticketKey('plain-branch-name')).toBeNull()
    expect(ticketKey('main')).toBeNull()
  })
})

describe('jiraBrowseUrl', () => {
  it('builds a /browse link from base + ticket key', () => {
    expect(jiraBrowseUrl('https://cutover.atlassian.net', 'CFE-3310/focus-fix')).toBe(
      'https://cutover.atlassian.net/browse/CFE-3310'
    )
  })

  it('tolerates a trailing slash on the base', () => {
    expect(jiraBrowseUrl('https://x.atlassian.net/', 'ABC-1')).toBe(
      'https://x.atlassian.net/browse/ABC-1'
    )
  })

  it('is null without a base or without a ticket key', () => {
    expect(jiraBrowseUrl('', 'ABC-1')).toBeNull()
    expect(jiraBrowseUrl('https://x.atlassian.net', 'no-ticket-here')).toBeNull()
  })
})

describe('repoHue / repoTint', () => {
  it('is stable and in range', () => {
    expect(repoHue('meadow')).toBe(repoHue('meadow'))
    expect(repoHue('meadow')).toBeGreaterThanOrEqual(0)
    expect(repoHue('meadow')).toBeLessThan(360)
  })

  it('differs across the demo repos', () => {
    expect(repoHue('meadow')).not.toBe(repoHue('lantern'))
  })

  it('emits the style-guide color-mix recipe', () => {
    expect(repoTint('meadow')).toBe(
      `color-mix(in oklab, var(--txt3) 45%, hsl(${repoHue('meadow')} 75% 58%))`
    )
  })
})

describe('devUrl', () => {
  it('fills the {port} placeholder (all occurrences)', () => {
    expect(devUrl('http://localhost:{port}/#/login', 9002)).toBe('http://localhost:9002/#/login')
    expect(devUrl('http://localhost:{port}/?p={port}', 9002)).toBe('http://localhost:9002/?p=9002')
  })

  it('falls back to a plain localhost URL when the template lacks {port}', () => {
    expect(devUrl('oops', 9002)).toBe('http://localhost:9002/')
  })
})

describe('hostUrl', () => {
  it('fills the {host} placeholder', () => {
    expect(hostUrl('http://{host}/#/login', 'rb-4047.localhost')).toBe(
      'http://rb-4047.localhost/#/login'
    )
  })

  it('falls back to a plain http URL when the template lacks {host}', () => {
    expect(hostUrl('oops', 'rb-4047.localhost')).toBe('http://rb-4047.localhost/')
  })
})

describe('worktreeUrl', () => {
  const cfg = {
    urlTemplate: 'http://localhost:{port}/#/login',
    hostUrlTemplate: 'http://{host}/#/login'
  }

  it('prefers the hostname template when the worktree has a host', () => {
    expect(worktreeUrl({ port: 9002, host: 'rb-4047.localhost' }, cfg)).toBe(
      'http://rb-4047.localhost/#/login'
    )
  })

  it('falls back to the port template exactly as before when there is no host', () => {
    expect(worktreeUrl({ port: 9002, host: null }, cfg)).toBe('http://localhost:9002/#/login')
    expect(worktreeUrl({ port: 9002 }, cfg)).toBe('http://localhost:9002/#/login')
  })

  it('is null when neither a host nor a port is available', () => {
    expect(worktreeUrl({ port: null, host: null }, cfg)).toBeNull()
  })
})

describe('tildePath', () => {
  it('abbreviates under the home dir', () => {
    expect(tildePath('/Users/me/dev/x', '/Users/me')).toBe('~/dev/x')
  })

  it('leaves paths outside home alone', () => {
    expect(tildePath('/opt/dev/x', '/Users/me')).toBe('/opt/dev/x')
  })
})
