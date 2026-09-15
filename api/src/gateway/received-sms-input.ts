export type IgnoredReceivedSmsReason = 'empty_message' | 'missing_sender'

const HOUR_MS = 60 * 60 * 1000
const LATE_ARRIVAL_MS = 24 * HOUR_MS
const DEFAULT_WEBHOOK_MAX_AGE_HOURS = 48

const toValidDate = (value: Date): Date | null =>
  Number.isFinite(value.getTime()) && value.getTime() > 0 ? value : null

// Millis first, then receivedAt, then server time.
export function resolveReceivedAt(
  receivedAtInMillis: unknown,
  receivedAt: unknown,
  now: Date = new Date(),
): Date {
  if (
    (typeof receivedAtInMillis === 'number' ||
      typeof receivedAtInMillis === 'string') &&
    String(receivedAtInMillis).trim() !== ''
  ) {
    const fromMillis = toValidDate(new Date(Number(receivedAtInMillis)))
    if (fromMillis) return fromMillis
  }

  if (typeof receivedAt === 'string' || receivedAt instanceof Date) {
    const fromDate = toValidDate(new Date(receivedAt))
    if (fromDate) return fromDate
  }

  return now
}

export function isMalformedReceivedSms(sender: unknown, message: unknown) {
  return (
    typeof message !== 'string' ||
    (sender !== undefined && sender !== null && typeof sender !== 'string')
  )
}

// Messages with nothing to deliver are acknowledged but not stored.
export function receivedSmsIgnoreReason(
  sender: string | null | undefined,
  message: string,
): IgnoredReceivedSmsReason | null {
  if (message === '') return 'empty_message'
  if (!sender?.trim()) return 'missing_sender'
  return null
}

// A late upload keeps its received time as createdAt; the upload time moves to originalCreatedAt.
export function lateArrivalTimestamps(
  receivedAt: Date,
  deviceCreatedAt?: Date,
  now: Date = new Date(),
): { createdAt?: Date; originalCreatedAt?: Date } {
  const isLate = now.getTime() - receivedAt.getTime() > LATE_ARRIVAL_MS
  const predatesDevice = !!deviceCreatedAt && receivedAt < deviceCreatedAt
  if (!isLate || predatesDevice) return {}
  return { createdAt: receivedAt, originalCreatedAt: now }
}

// null means received webhooks are sent whatever the message age.
export function receivedWebhookMaxAgeMs(): number | null {
  const raw = process.env.RECEIVED_WEBHOOK_MAX_AGE_HOURS?.trim()
  const hours = raw ? Number(raw) : NaN
  const resolved =
    Number.isFinite(hours) && hours >= 0 ? hours : DEFAULT_WEBHOOK_MAX_AGE_HOURS
  return resolved === 0 ? null : resolved * HOUR_MS
}

export function isTooLateForWebhook(receivedAt: Date, now: Date = new Date()) {
  const maxAge = receivedWebhookMaxAgeMs()
  return maxAge !== null && now.getTime() - receivedAt.getTime() > maxAge
}
