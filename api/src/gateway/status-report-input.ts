// Timestamps and counters the phone reports alongside a delivery status.
// Phone clocks drift, so a reported time is only taken when it is plausible.

const HOUR_MS = 60 * 60 * 1000
const MAX_FUTURE_MS = 26 * HOUR_MS
const MAX_AGE_MS = 30 * 24 * HOUR_MS
const MAX_REPORT_ATTEMPT = 100

/**
 * A device-reported millisecond timestamp, or undefined when it is missing,
 * unparseable, or too far from now to be a real send.
 */
export function resolveReportedAt(
  value: unknown,
  now: Date = new Date(),
): Date | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (String(value).trim() === '') return undefined

  const millis = Number(value)
  if (!Number.isFinite(millis) || millis <= 0) return undefined

  const drift = millis - now.getTime()
  if (drift > MAX_FUTURE_MS) return undefined
  if (-drift > MAX_AGE_MS) return undefined

  return new Date(millis)
}

/** Which attempt of the phone's own retry loop filed this report. */
export function resolveReportAttempt(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined

  const attempt = Number(value)
  if (!Number.isFinite(attempt)) return undefined

  const rounded = Math.floor(attempt)
  if (rounded < 1) return undefined

  return Math.min(rounded, MAX_REPORT_ATTEMPT)
}
