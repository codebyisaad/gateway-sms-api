import { firstName } from './first-name'

describe('firstName', () => {
  it.each([
    ['Ada Lovelace', 'Ada'],
    ['  Ada   Lovelace ', 'Ada'],
    ['Ada\tLovelace', 'Ada'],
    ['Ada', 'Ada'],
  ])('greets %j as %j', (name, expected) => {
    expect(firstName(name)).toBe(expected)
  })

  it.each(['', '   ', undefined, null])('falls back to "there" for %j', (name) => {
    expect(firstName(name)).toBe('there')
  })
})
