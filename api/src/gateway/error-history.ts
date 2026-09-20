// The failure trail on a message. Capped, so a flapping device cannot grow the
// document without bound.

export type ErrorHistorySource = 'fcm' | 'device' | 'server'

export const ERROR_HISTORY_LIMIT = 5
const MAX_MESSAGE_LENGTH = 300

export type ErrorHistoryEntry = {
  code: string
  message?: string
  at: Date
  source: ErrorHistorySource
}

/**
 * The `$push` fragment that appends one failure and keeps the last five, or
 * null when there is nothing to record. Callers spread it next to their `$set`.
 */
export function errorHistoryPush(
  {
    code,
    message,
    source,
  }: {
    code?: unknown
    message?: unknown
    source: ErrorHistorySource
  },
  at: Date = new Date(),
): { $push: Record<string, any> } | null {
  const entryCode = typeof code === 'string' ? code.trim() : ''
  const entryMessage = typeof message === 'string' ? message.trim() : ''

  if (!entryCode && !entryMessage) return null

  const entry: ErrorHistoryEntry = {
    code: entryCode || 'UNKNOWN',
    at,
    source,
  }
  if (entryMessage) {
    entry.message = entryMessage.slice(0, MAX_MESSAGE_LENGTH)
  }

  return {
    $push: {
      'metadata.errorHistory': {
        $each: [entry],
        $slice: -ERROR_HISTORY_LIMIT,
      },
    },
  }
}
