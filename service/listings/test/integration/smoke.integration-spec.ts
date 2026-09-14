import {
  closeTestPool,
  countRows,
  resetDb,
  seedDonor,
  testPool,
} from './support/db';

afterAll(closeTestPool);

describe('integration harness', () => {
  beforeEach(resetDb);

  it('has the cross-service schema this service runs against', async () => {
    const { rows } = await testPool().query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const names = rows.map((r) => r.table_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'organisations',
        'users',
        'listings',
        'listing_images',
        'requests',
        'request_idempotency_keys',
        'audit_log',
      ]),
    );
  });

  it('seeds and resets', async () => {
    const { org, user } = await seedDonor();
    expect(user.orgId).toBe(org.id);
    expect(await countRows('users')).toBe(1);

    await resetDb();
    expect(await countRows('users')).toBe(0);
  });
});
