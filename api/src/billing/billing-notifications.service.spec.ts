import { Types } from 'mongoose'
import {
  BILLING_NOTIFICATION_DEDUPE_HOURS,
  BillingNotificationsService,
} from './billing-notifications.service'
import { BillingNotificationType } from './schemas/billing-notification.schema'

describe('BillingNotificationsService - notifyOnce', () => {
  const userId = new Types.ObjectId().toString()
  const type = BillingNotificationType.MONTHLY_LIMIT_REACHED
  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000)

  let model: { findOne: jest.Mock; findOneAndUpdate: jest.Mock }
  let queue: { add: jest.Mock }
  let service: BillingNotificationsService

  const storedDoc = (lastEmailSentAt?: Date) => ({
    _id: 'n1',
    user: userId,
    type,
    title: 'title',
    message: 'message',
    meta: {},
    ...(lastEmailSentAt && { lastEmailSentAt }),
  })

  const notify = () =>
    service.notifyOnce({ userId, type, title: 'title', message: 'message' })

  const jobOptions = () => queue.add.mock.calls[0][2]

  beforeEach(() => {
    model = { findOne: jest.fn(), findOneAndUpdate: jest.fn() }
    queue = { add: jest.fn().mockResolvedValue(undefined) }
    service = new BillingNotificationsService(model as any, queue as any)
  })

  it('queues a first email and releases the job when it finishes', async () => {
    model.findOne.mockResolvedValue(null)
    model.findOneAndUpdate.mockResolvedValue(storedDoc())

    await notify()

    expect(queue.add).toHaveBeenCalledTimes(1)
    expect(jobOptions()).toMatchObject({
      jobId: 'n1:0',
      removeOnComplete: true,
      removeOnFail: true,
    })
  })

  it('keeps a burst of triggers on one pending job', async () => {
    model.findOne.mockResolvedValue(null)
    model.findOneAndUpdate.mockResolvedValue(storedDoc())

    await notify()
    await notify()

    expect(queue.add.mock.calls[0][2].jobId).toBe(queue.add.mock.calls[1][2].jobId)
  })

  it('does not queue inside the dedupe window', async () => {
    model.findOne.mockResolvedValue(storedDoc(hoursAgo(1)))

    await notify()

    expect(model.findOneAndUpdate).not.toHaveBeenCalled()
    expect(queue.add).not.toHaveBeenCalled()
  })

  it('queues again with a new job id once the window has passed', async () => {
    const lastSent = hoursAgo(49)
    model.findOne.mockResolvedValue(storedDoc(lastSent))
    model.findOneAndUpdate.mockResolvedValue(storedDoc(lastSent))

    await notify()

    expect(queue.add).toHaveBeenCalledTimes(1)
    expect(jobOptions().jobId).toBe(`n1:${lastSent.getTime()}`)
  })

  it('has a window for every notification type', () => {
    for (const notificationType of Object.values(BillingNotificationType)) {
      expect(BILLING_NOTIFICATION_DEDUPE_HOURS[notificationType]).toBeGreaterThan(0)
    }
  })
})
