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
});
