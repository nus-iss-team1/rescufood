import type { Database } from '../db/db.module';
import { notifications } from '../db/schema';
import { NotificationsRepository } from './notifications.repository';

describe('NotificationsRepository', () => {
  it('inserts the given record into the notifications table', async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn().mockReturnValue({ values });
    const db = { insert } as unknown as Database;

    const repository = new NotificationsRepository(db);
    const entry = {
      recipientEmail: 'ops@freshmart.sg',
      type: 'org_approved' as const,
      channel: 'email' as const,
      payload: { orgName: 'Fresh Mart' },
      status: 'sent' as const,
    };
    await repository.record(entry);

    expect(insert).toHaveBeenCalledWith(notifications);
    expect(values).toHaveBeenCalledWith(entry);
  });

  it('reads a duplicate from a drizzle-wrapped unique violation', async () => {
    const wrapped = Object.assign(new Error('Failed query'), {
      cause: { code: '23505' },
    });
    const values = jest.fn().mockRejectedValue(wrapped);
    const insert = jest.fn().mockReturnValue({ values });
    const db = { insert } as unknown as Database;

    const repository = new NotificationsRepository(db);
    await expect(
      repository.createInApp({
        recipientUserId: 'sub-1',
        recipientEmail: 'a@b.co',
        type: 'claim_created',
        body: 'x',
        payload: {},
      }),
    ).resolves.toBe('duplicate');
  });
});
