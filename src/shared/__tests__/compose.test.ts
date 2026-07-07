import { describe, expect, it } from 'vitest'
import { defaultComposeProject, parseComposeLs } from '../compose'

describe('parseComposeLs', () => {
  it('parses the JSON-array format', () => {
    const out = parseComposeLs(
      JSON.stringify([
        { Name: 'mdw-214', Status: 'running(4)', ConfigFiles: '/x/docker-compose.yml' },
        { Name: 'mdw-198', Status: 'exited(4)', ConfigFiles: '/y/docker-compose.yml' }
      ])
    )
    expect(out.get('mdw-214')).toBe(true)
    expect(out.get('mdw-198')).toBe(false)
  })

  it('parses the older one-object-per-line format', () => {
    const out = parseComposeLs(
      '{"Name":"a","Status":"running(1)"}\n{"Name":"b","Status":"exited(2)"}\n'
    )
    expect(out.get('a')).toBe(true)
    expect(out.get('b')).toBe(false)
  })

  it('treats partially-running projects as running', () => {
    const out = parseComposeLs(JSON.stringify([{ Name: 'a', Status: 'running(2), exited(1)' }]))
    expect(out.get('a')).toBe(true)
  })

  it('handles empty and garbage output', () => {
    expect(parseComposeLs('').size).toBe(0)
    expect(parseComposeLs('not json').size).toBe(0)
  })
})

describe('defaultComposeProject', () => {
  it.each([
    ['MDW-214', 'mdw-214'],
    ['My.App', 'myapp'],
    ['-leading', 'leading'],
    ['under_score', 'under_score']
  ])('%s → %s', (dir, project) => {
    expect(defaultComposeProject(dir)).toBe(project)
  })
})
