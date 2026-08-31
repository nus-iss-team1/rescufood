import type { Message } from '@aws-sdk/client-sqs';
import type { ConfigService } from '@nestjs/config';
import type { MailerService } from './mailer.service';
import type {
  InAppNotificationInput,
  NotificationRecord,
  NotificationsRepository,
} from './notifications.repository';
import { SqsConsumerService } from './sqs-consumer.service';

function fakeConfig(): ConfigService {
  const values: Record<string, string> = {
    AWS_REGION: 'ap-southeast-1',
    NOTIFICATION_QUEUE_URL: 'https://sqs.example/queue',
  };
  return {
    getOrThrow: (key: string) => {
      const value = values[key];
      if (!value) throw new Error(`unexpected config key ${key}`);
      return value;
    },
  } as unknown as ConfigService;
}

function message(body: unknown): Message {
  return {
    Body: typeof body === 'string' ? body : JSON.stringify(body),
    ReceiptHandle: 'rh-1',
  };
}

describe('SqsConsumerService.process', () => {
  let mailer: { send: jest.Mock };
  let repository: {
    record: jest.Mock<Promise<void>, [NotificationRecord]>;
    alreadyDelivered: jest.Mock<Promise<boolean>, [string, string, string]>;
    createInApp: jest.Mock<
      Promise<'created' | 'duplicate'>,
      [InAppNotificationInput]
    >;
    trimInAppFeed: jest.Mock<Promise<number>, [string]>;
  };
  let service: SqsConsumerService;

  beforeEach(() => {
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    repository = {
      record: jest
        .fn<Promise<void>, [NotificationRecord]>()
        .mockResolvedValue(undefined),
      alreadyDelivered: jest
        .fn<Promise<boolean>, [string, string, string]>()
        .mockResolvedValue(false),
      createInApp: jest
        .fn<Promise<'created' | 'duplicate'>, [InAppNotificationInput]>()
        .mockResolvedValue('created'),
      trimInAppFeed: jest.fn<Promise<number>, [string]>().mockResolvedValue(0),
    };
    service = new SqsConsumerService(
      fakeConfig(),
      mailer as unknown as MailerService,
      repository as unknown as NotificationsRepository,
    );
  });

  const claimCreated = (overrides: Record<string, unknown> = {}) => ({
    type: 'claim_created',
    channel: 'email',
    recipientEmail: 'donor@example.com',
    recipientUserId: 'sub-donor',
    eventId: 'claim:abc:created',
    payload: { listingDescription: 'Bread', rescueOrgName: 'City Harvest' },
    ...overrides,
  });

  it('sends the email and records success for a well-formed org_approved message', async () => {
    const outcome = await service.process(
      message({
        type: 'org_approved',
        channel: 'email',
        recipientEmail: 'ops@freshmart.sg',
        payload: { orgName: 'Fresh Mart' },
      }),
    );

    expect(outcome).toBe('sent');
    expect(mailer.send).toHaveBeenCalledWith(
      'ops@freshmart.sg',
      'Your Organisation Has Been Approved',
      expect.stringContaining('Fresh Mart'),
    );
    expect(repository.createInApp).not.toHaveBeenCalled();
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'ops@freshmart.sg',
        channel: 'email',
        status: 'sent',
      }),
    );
  });

  it('creates an in-app notification and sends the email for a claim_created message', async () => {
    const outcome = await service.process(message(claimCreated()));

    expect(outcome).toBe('sent');
    expect(repository.createInApp).toHaveBeenCalledTimes(1);
    const inApp = repository.createInApp.mock.calls[0][0];
    expect(inApp.recipientUserId).toBe('sub-donor');
    expect(inApp.type).toBe('claim_created');
    expect(inApp.eventId).toBe('claim:abc:created');
    expect(inApp.body).toContain('City Harvest');
    expect(repository.trimInAppFeed).toHaveBeenCalledWith('sub-donor');
    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'email', status: 'sent' }),
    );
  });

  it('does not fail the message when the feed trim errors', async () => {
    repository.trimInAppFeed.mockRejectedValueOnce(new Error('db blip'));

    const outcome = await service.process(message(claimCreated()));

    expect(outcome).toBe('sent');
  });

  it('is idempotent: a duplicate in-app event still resolves as sent', async () => {
    repository.createInApp.mockResolvedValueOnce('duplicate');
    repository.alreadyDelivered.mockResolvedValueOnce(true);

    const outcome = await service.process(message(claimCreated()));

    expect(outcome).toBe('sent');
    expect(repository.trimInAppFeed).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('redelivers when the in-app write fails, without sending the email', async () => {
    repository.createInApp.mockRejectedValueOnce(new Error('db down'));

    const outcome = await service.process(message(claimCreated()));

    expect(outcome).toBe('transient-failure');
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('still resolves as sent when the in-app row is created but the email fails', async () => {
    mailer.send.mockRejectedValueOnce(new Error('smtp timeout'));

    const outcome = await service.process(message(claimCreated()));

    expect(outcome).toBe('sent');
    expect(repository.createInApp).toHaveBeenCalledTimes(1);
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        status: 'failed',
        failureReason: 'smtp timeout',
      }),
    );
  });

  it('skips the email when it was already delivered for this event', async () => {
    repository.alreadyDelivered.mockResolvedValueOnce(true);

    const outcome = await service.process(
      message(claimCreated({ recipientUserId: undefined })),
    );

    expect(outcome).toBe('sent');
    expect(mailer.send).not.toHaveBeenCalled();
    expect(repository.createInApp).not.toHaveBeenCalled();
  });

  it('treats invalid JSON as a permanent failure without touching the mailer or repository', async () => {
    const outcome = await service.process(message('not json'));

    expect(outcome).toBe('permanent-failure');
    expect(mailer.send).not.toHaveBeenCalled();
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('treats a validation failure (bad email) as a permanent failure', async () => {
    const outcome = await service.process(
      message({
        type: 'org_approved',
        channel: 'email',
        recipientEmail: 'not-an-email',
      }),
    );

    expect(outcome).toBe('permanent-failure');
    expect(mailer.send).not.toHaveBeenCalled();
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('records and permanently fails an email-only message of an unimplemented type', async () => {
    const outcome = await service.process(
      message({
        type: 'listing_material_change',
        channel: 'email',
        recipientEmail: 'donor@example.com',
      }),
    );

    expect(outcome).toBe('permanent-failure');
    expect(mailer.send).not.toHaveBeenCalled();
    expect(repository.record).toHaveBeenCalledTimes(1);
    const recorded = repository.record.mock.calls[0][0];
    expect(recorded.status).toBe('failed');
    expect(recorded.failureReason).toContain('listing_material_change');
  });

  it('treats a mailer error as transient for an email-only message', async () => {
    mailer.send.mockRejectedValueOnce(new Error('smtp timeout'));

    const outcome = await service.process(
      message({
        type: 'org_approved',
        channel: 'email',
        recipientEmail: 'ops@freshmart.sg',
        payload: { orgName: 'Fresh Mart' },
      }),
    );

    expect(outcome).toBe('transient-failure');
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        failureReason: 'smtp timeout',
      }),
    );
  });

  it('does not crash when the repository itself fails to record a failure', async () => {
    mailer.send.mockRejectedValueOnce(new Error('smtp timeout'));
    repository.record.mockRejectedValueOnce(
      new Error('password authentication failed'),
    );

    const outcome = await service.process(
      message({
        type: 'org_approved',
        channel: 'email',
        recipientEmail: 'ops@freshmart.sg',
        payload: { orgName: 'Fresh Mart' },
      }),
    );

    expect(outcome).toBe('transient-failure');
  });

  it('still reports success when the repository fails to record a successful send', async () => {
    repository.record.mockRejectedValueOnce(
      new Error('password authentication failed'),
    );

    const outcome = await service.process(
      message({
        type: 'org_approved',
        channel: 'email',
        recipientEmail: 'ops@freshmart.sg',
        payload: { orgName: 'Fresh Mart' },
      }),
    );

    expect(outcome).toBe('sent');
  });
});
