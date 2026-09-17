import { BillingNotificationType } from './schemas/billing-notification.schema'

/**
 * Subjects and email bodies for billing notifications, in one place.
 *
 * This used to live in two duplicated `subjectForType` maps plus message
 * strings built at four call sites, which had already drifted. The stored
 * notification keeps its own short title and message for the in-app list; this
 * module owns what the email says.
 *
 * Copy principles, since these are the emails that decide whether someone
 * upgrades:
 * - Lead with the person's situation, not the policy.
 * - Give the way out that costs nothing first, then the paid one. Someone who
 *   cannot pay still needs to know they can wait or split the batch.
 * - Never scold. Hitting a limit is the product working, not the user erring.
 * - The approaching emails are the real moment: the user is still succeeding
 *   and can act calmly. The reached emails arrive when they are already stuck.
 */

const PRICING_URL = 'https://textbee.dev/pricing'
const ACCOUNT_URL = 'https://app.textbee.dev/dashboard/account'

export const NOTIFICATION_SUBJECTS: Record<string, string> = {
  [BillingNotificationType.DAILY_LIMIT_APPROACHING]:
    "You're close to today's message limit",
  [BillingNotificationType.MONTHLY_LIMIT_APPROACHING]:
    "You're close to your monthly message limit",
  [BillingNotificationType.DAILY_LIMIT_REACHED]:
    "You've reached today's message limit",
  [BillingNotificationType.MONTHLY_LIMIT_REACHED]:
    "You've reached your monthly message limit",
  [BillingNotificationType.BULK_SMS_LIMIT_REACHED]:
    'Your batch was too big for your plan',
  [BillingNotificationType.DEVICE_LIMIT_REACHED]:
    'All your device slots are in use',
  [BillingNotificationType.EMAIL_VERIFICATION_REQUIRED]:
    'Verify your email to keep sending',
}

export function subjectForType(type: string, fallback?: string): string {
  return NOTIFICATION_SUBJECTS[type] || fallback || 'Account notification'
}

export interface NotificationEmailContent {
  title: string
  preheader: string
  message: string
  usage?: { label: string; used: string; limit: string; percent: number }
  resetNote?: string
  benefitsTitle?: string
  benefits?: string[]
  footnote?: string
  ctaLabel: string
  ctaUrl: string
}

const n = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const fmt = (value: unknown): string => n(value).toLocaleString('en-US')

/** Clamped so a bar can never overflow its track when usage passes the limit. */
const pct = (used: unknown, limit: unknown): number => {
  const total = n(limit)
  if (total <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((n(used) / total) * 100)))
}

const incomingNote = (meta: Record<string, any>): string =>
  meta.receivesStored === false ? '' : ' Incoming messages still arrive.'

const MORE_VOLUME = [
  'A bigger monthly message allowance',
  'No daily cap',
  'Room for more phones, so sends go out faster',
]

export function buildEmailContent(
  type: string,
  meta: Record<string, any> = {},
  fallbackTitle = '',
  fallbackMessage = '',
): NotificationEmailContent {
  switch (type) {
    case BillingNotificationType.DAILY_LIMIT_APPROACHING: {
      const used = meta.processedSmsToday
      const limit = meta.dailyLimit
      const left = Math.max(0, n(limit) - n(used))
      return {
        title: NOTIFICATION_SUBJECTS[type],
        preheader: `${fmt(used)} of ${fmt(limit)} messages used today. ${fmt(left)} left.`,
        message: `You've used ${fmt(used)} of your ${fmt(limit)} messages for today. Sent and received messages both count. You have ${fmt(left)} left.`,
        usage: {
          label: 'Messages used today',
          used: fmt(used),
          limit: fmt(limit),
          percent: pct(used, limit),
        },
        resetNote:
          'Your daily count resets at midnight, so tomorrow starts fresh.',
        benefitsTitle: 'If you need more room today',
        benefits: MORE_VOLUME,
        ctaLabel: 'See plans',
        ctaUrl: PRICING_URL,
      }
    }

    case BillingNotificationType.MONTHLY_LIMIT_APPROACHING: {
      const used = meta.processedSmsLastMonth
      const limit = meta.monthlyLimit
      const left = Math.max(0, n(limit) - n(used))
      return {
        title: NOTIFICATION_SUBJECTS[type],
        preheader: `${fmt(used)} of ${fmt(limit)} messages used in the last 30 days. ${fmt(left)} left.`,
        message: `You've used ${fmt(used)} of your ${fmt(limit)} messages for the last 30 days. Sent and received messages both count. You have ${fmt(left)} left.`,
        usage: {
          label: 'Messages in the last 30 days',
          used: fmt(used),
          limit: fmt(limit),
          percent: pct(used, limit),
        },
        // Rolling window, not a billing period: capacity returns gradually as
        // individual messages age past 30 days, not all at once on renewal.
        resetNote:
          'The count covers a rolling 30 days, not a calendar month. Each message leaves the count 30 days after it was sent or received, so room frees up a little every day.',
        benefitsTitle: 'If you need more room',
        benefits: MORE_VOLUME,
        ctaLabel: 'See plans',
        ctaUrl: PRICING_URL,
      }
    }

    case BillingNotificationType.DAILY_LIMIT_REACHED: {
      const limit = meta.dailyLimit
      return {
        title: NOTIFICATION_SUBJECTS[type],
        preheader: `Sending starts again at midnight.${incomingNote(meta)}`,
        message: `You've used all ${fmt(limit)} of your messages for today. Sent and received messages both count, so sending is paused until midnight.${incomingNote(meta)}`,
        usage: {
          label: 'Messages used today',
          used: fmt(limit),
          limit: fmt(limit),
          percent: 100,
        },
        resetNote:
          "Sending starts again automatically at midnight. You don't need to do anything.",
        benefitsTitle: 'If you need to keep sending now',
        benefits: MORE_VOLUME,
        ctaLabel: 'See plans',
        ctaUrl: PRICING_URL,
      }
    }

    case BillingNotificationType.MONTHLY_LIMIT_REACHED: {
      const limit = meta.monthlyLimit
      return {
        title: NOTIFICATION_SUBJECTS[type],
        preheader: `Sending is paused.${incomingNote(meta)}`,
        message: `You've used your ${fmt(limit)} messages for the last 30 days. Sent and received messages both count, so sending is paused for now.${incomingNote(meta)}`,
        usage: {
          label: 'Messages in the last 30 days',
          used: fmt(limit),
          limit: fmt(limit),
          percent: 100,
        },
        resetNote:
          'The count covers a rolling 30 days, so sending starts again on its own as older messages age out.',
        benefitsTitle: 'If you need to keep sending now',
        benefits: MORE_VOLUME,
        ctaLabel: 'See plans',
        ctaUrl: PRICING_URL,
      }
    }

    case BillingNotificationType.BULK_SMS_LIMIT_REACHED: {
      const limit = meta.bulkSendLimit
      const attempted = meta.attempted
      return {
        title: NOTIFICATION_SUBJECTS[type],
        preheader: 'Nothing was sent. Split the list or upgrade.',
        message: `Your batch had ${fmt(attempted)} recipients, and your plan allows up to ${fmt(limit)} per batch. Nothing was sent.`,
        // Deliberately no usage bar: this is attempted against a maximum, not
        // consumption against an allowance, and a full bar would imply the
        // quota is spent when it is not.
        resetNote: `Split the list into batches of ${fmt(limit)} or fewer. Splitting sends everything at no extra cost.`,
        benefitsTitle: 'Or upgrade for',
        benefits: [
          'Bigger batches, so a whole list goes out in one request',
          'A bigger monthly message allowance',
          'Room for more phones, so sends go out faster',
        ],
        footnote:
          'Your phone sends one message at a time, so a large batch goes out steadily, whatever the batch size.',
        ctaLabel: 'See plans',
        ctaUrl: PRICING_URL,
      }
    }

    case BillingNotificationType.DEVICE_LIMIT_REACHED: {
      const limit = meta.deviceLimit
      return {
        title: NOTIFICATION_SUBJECTS[type],
        preheader: 'Remove a device you no longer use, or upgrade for more.',
        message:
          n(limit) === 1
            ? 'Your plan covers 1 active device, and it is in use. Remove it if you no longer need it to free the slot right away.'
            : `Your plan covers ${fmt(limit)} active devices, and all of them are in use. Remove one you no longer need to free a slot right away.`,
        benefitsTitle: 'More devices also give you',
        benefits: [
          'Sends split across several phones, so they go out faster',
          'A backup if one phone goes offline',
        ],
        ctaLabel: 'See plans',
        ctaUrl: PRICING_URL,
      }
    }

    case BillingNotificationType.EMAIL_VERIFICATION_REQUIRED: {
      return {
        title: NOTIFICATION_SUBJECTS[type],
        preheader: 'One click confirms your email address.',
        message:
          'Confirm your email address to start sending and receiving messages. It takes one click.',
        ctaLabel: 'Verify my email',
        ctaUrl: ACCOUNT_URL,
      }
    }

    default:
      return {
        title: fallbackTitle || 'Account notification',
        preheader: fallbackMessage.slice(0, 120),
        message: fallbackMessage,
        ctaLabel: 'Open dashboard',
        ctaUrl: 'https://app.textbee.dev/dashboard',
      }
  }
}
