import { describe, expect, it } from 'vitest'
import { extraPorts, parseEnv, portFrom } from '../env'

describe('parseEnv', () => {
  it('parses simple KEY=VALUE lines', () => {
    expect(parseEnv('FE_PORT=9002\nAPI_PORT=3004')).toEqual({
      FE_PORT: '9002',
      API_PORT: '3004'
    })
  })

  it('ignores comments, blanks, and non-assignments', () => {
    const env = parseEnv('# comment\n\nFE_PORT=9002\nnot a line\n  # indented comment')
    expect(env).toEqual({ FE_PORT: '9002' })
  })

  it('handles export prefixes and surrounding whitespace', () => {
    expect(parseEnv('export FE_PORT = 9002')).toEqual({ FE_PORT: '9002' })
  })

  it('strips matching quotes', () => {
    expect(parseEnv('A="hello world"\nB=\'single\'')).toEqual({
      A: 'hello world',
      B: 'single'
    })
  })

  it('strips inline comments on unquoted values only', () => {
    expect(parseEnv('A=9002 # the dev port\nB="keep # this"')).toEqual({
      A: '9002',
      B: 'keep # this'
    })
  })

  it('lets later keys win', () => {
    expect(parseEnv('A=1\nA=2')).toEqual({ A: '2' })
  })
})

describe('portFrom', () => {
  it('returns a valid port', () => {
    expect(portFrom({ FE_PORT: '9002' }, 'FE_PORT')).toBe(9002)
  })

  it.each([
    ['missing key', {}],
    ['non-numeric', { FE_PORT: 'auto' }],
    ['negative', { FE_PORT: '-1' }],
    ['zero', { FE_PORT: '0' }],
    ['out of range', { FE_PORT: '70000' }],
    ['decimal', { FE_PORT: '90.2' }]
  ])('rejects %s', (_name, env) => {
    expect(portFrom(env as Record<string, string>, 'FE_PORT')).toBeNull()
  })
})

describe('extraPorts', () => {
  it('labels keys by stripping the _PORT suffix, preserving config order', () => {
    const env = { API_PORT: '3004', WS_PORT: '8084', DB_PORT: '5436' }
    expect(extraPorts(env, ['API_PORT', 'WS_PORT', 'DB_PORT'])).toEqual([
      { key: 'api', port: 3004 },
      { key: 'ws', port: 8084 },
      { key: 'db', port: 5436 }
    ])
  })

  it('skips keys without a usable port', () => {
    expect(extraPorts({ WS_PORT: 'x' }, ['API_PORT', 'WS_PORT'])).toEqual([])
  })

  it('keeps the raw key when stripping would leave nothing', () => {
    expect(extraPorts({ PORT: '4000' }, ['PORT'])).toEqual([{ key: 'PORT', port: 4000 }])
  })
})
