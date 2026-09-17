import { BillingNotificationsProcessor } from './billing-notifications.processor'
import { BillingNotificationType } from '../schemas/billing-notification.schema'

describe('BillingNotificationsProcessor', () => {
  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000)

  let mail: { sendEmailFromTemplate: jest.Mock }
  let notifications: { findById: jest.Mock; updateOne: jest.Mock }
  let users: { findById: jest.Mock }
  let processor: BillingNotificationsProcessor

  const job = (type: string) =>
    ({
      data: {
        notificationId: 'n1',
        userId: 'u1',
        type,
        title: 'title',
        message: 'message',
        meta: { deviceLimit: 1 },
        createdAt: new Date(),
        sendEmail: true,
      },
    }) as any

  beforeEach(() => {
    mail = { sendEmailFromTemplate: jest.fn().mockResolvedValue(undefined) }
    notifications = { findById: jest.fn(), updateOne: jest.fn().mockResolvedValue(undefined) }
    users = {
      findById: jest.fn().mockResolvedValue({ email: 'ada@example.com', name: 'Ada Lovelace' }),
    }
    processor = new BillingNotificationsProcessor(
      mail as any,
      notifications as any,
      users as any,
    )
  })

  it('skips a device limit email sent 30 hours ago', async () => {
    notifications.findById.mockResolvedValue({ lastEmailSentAt: hoursAgo(30) })

    await processor.handleSend(job(BillingNotificationType.DEVICE_LIMIT_REACHED))

    expect(mail.sendEmailFromTemplate).not.toHaveBeenCalled()
  })

  it('sends a device limit email once its window has passed', async () => {
    notifications.findById.mockResolvedValue({ lastEmailSentAt: hoursAgo(49) })

    await processor.handleSend(job(BillingNotificationType.DEVICE_LIMIT_REACHED))

    expect(mail.sendEmailFromTemplate).toHaveBeenCalledTimes(1)
    expect(notifications.updateOne).toHaveBeenCalledWith(
      { _id: 'n1' },
      expect.objectContaining({ $inc: { sentEmailCount: 1 } }),
    )
  })

  it('logs a failed email job', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    processor.onFailed(job(BillingNotificationType.MONTHLY_LIMIT_REACHED), new Error('smtp down'))

    expect(error).toHaveBeenCalledWith(
      'billing notification email failed',
      expect.objectContaining({ notificationId: 'n1', error: 'smtp down' }),
    )
    error.mockRestore()
  })
})
