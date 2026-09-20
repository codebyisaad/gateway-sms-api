import { ERROR_HISTORY_LIMIT, errorHistoryPush } from './error-history'

describe('errorHistoryPush', () => {
  const at = new Date('2026-09-20T10:00:00.000Z')

  it('appends one entry and keeps the last five', () => {
    const fragment = errorHistoryPush(
      { code: 'NO_SERVICE', message: 'no carrier', source: 'device' },
      at,
    )

    expect(fragment).toEqual({
      $push: {
        'metadata.errorHistory': {
          $each: [
            { code: 'NO_SERVICE', message: 'no carrier', at, source: 'device' },
          ],
          $slice: -ERROR_HISTORY_LIMIT,
        },
      },
    })
  })

  it('records a code-only failure and omits the empty message', () => {
    const fragment = errorHistoryPush({ code: 'FCM_SEND_ERROR', source: 'fcm' }, at)

    expect(fragment.$push['metadata.errorHistory'].$each[0]).toEqual({
      code: 'FCM_SEND_ERROR',
      at,
      source: 'fcm',
    })
  })

  it('labels a message-only failure UNKNOWN rather than dropping it', () => {
    const fragment = errorHistoryPush({ message: 'timed out', source: 'server' }, at)

    expect(fragment.$push['metadata.errorHistory'].$each[0].code).toBe('UNKNOWN')
  })

  it('returns null when there is nothing to record', () => {
    expect(errorHistoryPush({ source: 'server' }, at)).toBeNull()
    expect(errorHistoryPush({ code: '  ', message: '', source: 'fcm' }, at)).toBeNull()
    expect(errorHistoryPush({ code: 42 as any, source: 'fcm' }, at)).toBeNull()
  })

  it('truncates a long message', () => {
    const fragment = errorHistoryPush(
      { code: 'X', message: 'y'.repeat(1000), source: 'device' },
      at,
    )

    expect(fragment.$push['metadata.errorHistory'].$each[0].message).toHaveLength(300)
  })
})
