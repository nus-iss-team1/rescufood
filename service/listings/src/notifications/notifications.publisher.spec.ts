import { ConfigService } from '@nestjs/config';

const send = jest.fn();
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn(() => ({ send })),
  SendMessageCommand: jest.fn((input: unknown) => ({ input })),
}));

import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { NotificationsPublisher } from './notifications.publisher';

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get: (k: string) => values[k],
    getOrThrow: (k: string) => {
      const v = values[k];
      if (v === undefined) throw new Error(`missing ${k}`);
      return v;
    },
  } as unknown as ConfigService;
}

const QUEUE = 'https://sqs.local/queue';

beforeEach(() => {
  send.mockReset().mockResolvedValue({});
  (SendMessageCommand as unknown as jest.Mock).mockClear();
});

describe('NotificationsPublisher', () => {
  it('publishes a well-formed email message', async () => {
    const logger = makeLogger();
    const publisher = new NotificationsPublisher(
      makeConfig({
        NOTIFICATION_QUEUE_URL: QUEUE,
        AWS_REGION: 'ap-southeast-1',
      }),
      logger as never,
    );

    await publisher.claimCreated('donor@x.com', {
      listingDescription: 'Bread',
      rescueOrgName: 'City Harvest',
      pickupLocation: 'Loc A',
      pickupWindow: 'Tue 3-7pm',
    });

    expect(send).toHaveBeenCalledTimes(1);
    const [input] = (SendMessageCommand as unknown as jest.Mock).mock
      .calls[0] as [{ QueueUrl: string; MessageBody: string }];
    expect(input.QueueUrl).toBe(QUEUE);
    expect(JSON.parse(input.MessageBody)).toEqual({
      type: 'claim_created',
      channel: 'email',
      recipientEmail: 'donor@x.com',
      payload: {
        listingDescription: 'Bread',
        rescueOrgName: 'City Harvest',
        pickupLocation: 'Loc A',
        pickupWindow: 'Tue 3-7pm',
      },
    });
  });

  it('maps pickupReminder to the pickup_reminder type, carrying the phase', async () => {
    const publisher = new NotificationsPublisher(
      makeConfig({ NOTIFICATION_QUEUE_URL: QUEUE, AWS_REGION: 'x' }),
      makeLogger() as never,
    );

    await publisher.pickupReminder('p@x.com', {
      phase: 'closing',
      listingDescription: 'Milk',
      pickupWindow: 'Tue 3-7pm',
    });

    const [input] = (SendMessageCommand as unknown as jest.Mock).mock
      .calls[0] as [{ MessageBody: string }];
    const body = JSON.parse(input.MessageBody) as {
      type: string;
      payload: { phase: string };
    };
    expect(body.type).toBe('pickup_reminder');
    expect(body.payload.phase).toBe('closing');
  });

  it('maps claimEnded to the claim_cancelled type', async () => {
    const publisher = new NotificationsPublisher(
      makeConfig({ NOTIFICATION_QUEUE_URL: QUEUE, AWS_REGION: 'x' }),
      makeLogger() as never,
    );

    await publisher.claimEnded('p@x.com', {
      listingDescription: 'Milk',
      endedBy: 'donor',
    });

    const [input] = (SendMessageCommand as unknown as jest.Mock).mock
      .calls[0] as [{ MessageBody: string }];
    const body = JSON.parse(input.MessageBody) as { type: string };
    expect(body.type).toBe('claim_cancelled');
  });

  it('is a no-op when NOTIFICATION_QUEUE_URL is unset, and warns once', () => {
    const logger = makeLogger();
    const publisher = new NotificationsPublisher(
      makeConfig({}),
      logger as never,
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    return publisher
      .listingExpired('x@x.com', { listingDescription: 'X', wasClaimed: false })
      .then(() => {
        expect(send).not.toHaveBeenCalled();
      });
  });

  it('skips a publish with no recipient email', async () => {
    const publisher = new NotificationsPublisher(
      makeConfig({ NOTIFICATION_QUEUE_URL: QUEUE, AWS_REGION: 'x' }),
      makeLogger() as never,
    );

    await publisher.pickupCompleted('', { listingDescription: 'X' });

    expect(send).not.toHaveBeenCalled();
  });

  it('logs and swallows a send failure', async () => {
    send.mockRejectedValue(new Error('sqs down'));
    const logger = makeLogger();
    const publisher = new NotificationsPublisher(
      makeConfig({ NOTIFICATION_QUEUE_URL: QUEUE, AWS_REGION: 'x' }),
      logger as never,
    );

    await expect(
      publisher.listingExpired('x@x.com', {
        listingDescription: 'X',
        wasClaimed: true,
      }),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
