import {
  closeTestPool,
  countRows,
  resetDb,
  seedNotification,
  testPool,
} from './support/db';

afterAll(closeTestPool);

describe('integration harness', () => {
  beforeEach(resetDb);

  it('has the notifications schema', async () => {
    const { rows } = await testPool().query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'notifications' ORDER BY column_name`,
    );
    expect(rows.map((r) => r.column_name)).toEqual(
      expect.arrayContaining([
        'recipient_email',
        'recipient_user_id',
        'channel',
        'event_id',
        'read_at',
        'deleted_at',
      ]),
    );
  });

  it('seeds and resets', async () => {
    await seedNotification();
    expect(await countRows()).toBe(1);
    await resetDb();
    expect(await countRows()).toBe(0);
  });
});
