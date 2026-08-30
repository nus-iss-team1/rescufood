import type { Message } from '@aws-sdk/client-sqs';
import type { ConfigService } from '@nestjs/config';
import type { MailerService } from './mailer.service';
import type {
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
  };
  let service: SqsConsumerService;

  beforeEach(() => {
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    repository = {
      record: jest
        .fn<Promise<void>, [NotificationRecord]>()
        .mockResolvedValue(undefined),
    };
    service = new SqsConsumerService(
      fakeConfig(),
      mailer as unknown as MailerService,
      repository as unknown as NotificationsRepository,
    );
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
      'Your organisation has been approved',
      expect.stringContaining('Fresh Mart'),
    );
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'ops@freshmart.sg',
        status: 'sent',
      }),
    );
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

  it('records and permanently fails a well-formed message of an unimplemented type', async () => {
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

  it('treats a mailer error as transient so the message is left for SQS to retry', async () => {
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

  // A failing record() during failure handling must not crash the consumer.
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
