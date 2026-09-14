import { randomUUID } from 'node:crypto';
import { closeTestPool, countRows, resetDb } from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';

let ctx: RepoContext;

beforeAll(async () => {
  ctx = await createRepoContext();
});

afterAll(async () => {
  await ctx.close();
  await closeTestPool();
});

beforeEach(async () => {
  await resetDb();
  ctx.mailer.send.mockClear();
});

const message = (payload: Record<string, unknown>) => ({
  Body: JSON.stringify(payload),
});

describe('SqsConsumerService.process (integration)', () => {
  it('creates an in-app notification for a valid message', async () => {
    const outcome = await ctx.consumer.process(
      message({
        type: 'claim_created',
        channel: 'in_app',
        recipientEmail: 'donor@example.org',
        recipientUserId: `sub-${randomUUID().slice(0, 8)}`,
        eventId: randomUUID(),
        payload: { listingDescription: 'Sourdough' },
      }),
    );

    expect(outcome).toBe('sent');
    expect(await countRows("channel = 'in_app'")).toBe(1);
  });

  it('is idempotent on a redelivered message', async () => {
    const msg = message({
      type: 'claim_created',
      channel: 'in_app',
      recipientEmail: 'donor@example.org',
      recipientUserId: `sub-${randomUUID().slice(0, 8)}`,
      eventId: randomUUID(),
      payload: {},
    });

    expect(await ctx.consumer.process(msg)).toBe('sent');
    expect(await ctx.consumer.process(msg)).toBe('sent');
    expect(await countRows("channel = 'in_app'")).toBe(1);
  });

  it('sends and records an email-only notification', async () => {
    const outcome = await ctx.consumer.process(
      message({
        type: 'org_approved',
        channel: 'email',
        recipientEmail: 'partner@example.org',
        eventId: randomUUID(),
        payload: { orgName: 'City Harvest' },
      }),
    );

    expect(outcome).toBe('sent');
    expect(ctx.mailer.send).toHaveBeenCalledTimes(1);
    expect(await countRows("channel = 'email' and status = 'sent'")).toBe(1);
  });

  it('does not resend an email already delivered for the event', async () => {
    const eventId = randomUUID();
    const msg = message({
      type: 'org_approved',
      channel: 'email',
      recipientEmail: 'partner@example.org',
      eventId,
      payload: {},
    });

    await ctx.consumer.process(msg);
    await ctx.consumer.process(msg);

    expect(ctx.mailer.send).toHaveBeenCalledTimes(1);
  });

  it('records a failed row and asks for retry when the mailer throws', async () => {
    ctx.mailer.send.mockRejectedValueOnce(new Error('smtp timeout'));

    const outcome = await ctx.consumer.process(
      message({
        type: 'org_approved',
        channel: 'email',
        recipientEmail: 'partner@example.org',
        eventId: randomUUID(),
        payload: {},
      }),
    );

    expect(outcome).toBe('transient-failure');
    expect(await countRows("channel = 'email' and status = 'failed'")).toBe(1);
  });

  it('rejects a non-JSON body as a permanent failure', async () => {
    expect(await ctx.consumer.process({ Body: 'not json' })).toBe(
      'permanent-failure',
    );
    expect(await countRows()).toBe(0);
  });

  it('rejects a message that fails validation', async () => {
    const outcome = await ctx.consumer.process(
      message({
        type: 'claim_created',
        channel: 'in_app',
        recipientEmail: 'not-an-email',
        payload: {},
      }),
    );
    expect(outcome).toBe('permanent-failure');
    expect(await countRows()).toBe(0);
  });
});
