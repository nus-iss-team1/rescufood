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
const ID = { eventId: 'claim:c1:created', recipientUserId: 'sub-1' };

beforeEach(() => {
  send.mockReset().mockResolvedValue({});
  (SendMessageCommand as unknown as jest.Mock).mockClear();
});

function makePublisher(
  values: Record<string, string | undefined> = {
    NOTIFICATION_QUEUE_URL: QUEUE,
    AWS_REGION: 'x',
  },
) {
  return new NotificationsPublisher(makeConfig(values), makeLogger() as never);
}

function lastBody(): Record<string, unknown> {
  const [input] = (SendMessageCommand as unknown as jest.Mock).mock
    .calls[0] as [{ MessageBody: string }];
  return JSON.parse(input.MessageBody) as Record<string, unknown>;
}

describe('NotificationsPublisher', () => {
  it('publishes a well-formed email message carrying the event identity', async () => {
    await makePublisher().claimCreated(
      'donor@x.com',
      {
        listingDescription: 'Bread',
        rescueOrgName: 'City Harvest',
        pickupLocation: 'Loc A',
        pickupWindow: 'Tue 3-7pm',
        audience: 'donor',
      },
      ID,
    );

    expect(send).toHaveBeenCalledTimes(1);
    const [input] = (SendMessageCommand as unknown as jest.Mock).mock
      .calls[0] as [{ QueueUrl: string; MessageBody: string }];
    expect(input.QueueUrl).toBe(QUEUE);
    expect(JSON.parse(input.MessageBody)).toEqual({
      type: 'claim_created',
      channel: 'email',
      recipientEmail: 'donor@x.com',
      recipientUserId: 'sub-1',
      eventId: 'claim:c1:created',
      payload: {
        listingDescription: 'Bread',
        rescueOrgName: 'City Harvest',
        pickupLocation: 'Loc A',
        pickupWindow: 'Tue 3-7pm',
        audience: 'donor',
      },
    });
  });

  it('omits recipientUserId when there is no in-app recipient', async () => {
    await makePublisher().listingExpired(
      'x@x.com',
      { listingDescription: 'X', wasClaimed: false },
      { eventId: 'listing:l1:expired', recipientUserId: null },
    );
    expect(lastBody()).not.toHaveProperty('recipientUserId');
    expect(lastBody().eventId).toBe('listing:l1:expired');
  });

  it('maps pickupReminder to the pickup_reminder type, carrying the phase', async () => {
    await makePublisher().pickupReminder(
      'p@x.com',
      {
        phase: 'closing',
        listingDescription: 'Milk',
        pickupWindow: 'Tue 3-7pm',
      },
      { eventId: 'claim:c1:pickup-closing', recipientUserId: 'sub-1' },
    );
    const body = lastBody() as { type: string; payload: { phase: string } };
    expect(body.type).toBe('pickup_reminder');
    expect(body.payload.phase).toBe('closing');
  });

  it('maps claimEnded to the claim_cancelled type', async () => {
    await makePublisher().claimEnded(
      'p@x.com',
      { listingDescription: 'Milk', endedBy: 'donor' },
      { eventId: 'claim:c1:cancelled', recipientUserId: 'sub-1' },
    );
    expect((lastBody() as { type: string }).type).toBe('claim_cancelled');
  });

  it('is a no-op when NOTIFICATION_QUEUE_URL is unset, and warns once', () => {
    const logger = makeLogger();
    const publisher = new NotificationsPublisher(
      makeConfig({}),
      logger as never,
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    return publisher
      .listingExpired(
        'x@x.com',
        { listingDescription: 'X', wasClaimed: false },
        { eventId: 'listing:l1:expired' },
      )
      .then(() => {
        expect(send).not.toHaveBeenCalled();
      });
  });

  it('skips a publish with no recipient email', async () => {
    await makePublisher().pickupCompleted(
      '',
      { listingDescription: 'X' },
      { eventId: 'claim:c1:completed' },
    );
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
      publisher.listingExpired(
        'x@x.com',
        { listingDescription: 'X', wasClaimed: true },
        { eventId: 'listing:l1:expired', recipientUserId: 'sub-1' },
      ),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
