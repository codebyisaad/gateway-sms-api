import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  parseHistoryFilters,
  serializeHistoryFilters,
  type HistoryFilters,
} from './use-history-filters'

const parse = (query: string) => parseHistoryFilters(new URLSearchParams(query))

describe('parseHistoryFilters', () => {
  it('falls back to the defaults on an empty query', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS)
  })

  it('reads a full query', () => {
    expect(parse('devices=a,b&direction=received&search=hi&page=3')).toEqual({
      deviceIds: ['a', 'b'],
      direction: 'received',
      search: 'hi',
      page: 3,
    })
  })

  it('drops empty entries and duplicates from the device list', () => {
    expect(parse('devices=a,,b,a').deviceIds).toEqual(['a', 'b'])
    expect(parse('devices= a , b ').deviceIds).toEqual(['a', 'b'])
  })

  it('rejects a direction the API does not accept', () => {
    expect(parse('direction=bogus').direction).toBe('all')
    expect(parse('direction=').direction).toBe('all')
  })

  it('rejects a page that is not a positive integer', () => {
    for (const page of ['0', 'abc', '-2', '1.5', '']) {
      expect(parse(`page=${page}`).page).toBe(1)
    }
  })
})

describe('serializeHistoryFilters', () => {
  it('omits every default, so an unfiltered view is a bare path', () => {
    expect(serializeHistoryFilters(DEFAULT_FILTERS)).toBe('')
  })

  it('keeps a stable key order', () => {
    expect(
      serializeHistoryFilters({
        deviceIds: ['a'],
        direction: 'sent',
        search: 'x',
        page: 2,
      })
    ).toBe('devices=a&direction=sent&search=x&page=2')
  })

  it('omits only the fields left at their default', () => {
    expect(
      serializeHistoryFilters({ ...DEFAULT_FILTERS, direction: 'sent' })
    ).toBe('direction=sent')
  })

  it('round trips a search term full of query syntax', () => {
    const filters: HistoryFilters = {
      deviceIds: ['a', 'b'],
      direction: 'sent',
      search: 'a & b=c?d',
      page: 4,
    }
    expect(parse(serializeHistoryFilters(filters))).toEqual(filters)
  })
})
