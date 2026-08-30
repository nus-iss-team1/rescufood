import type { Database } from '../db/db.module';
import { auditLog } from '../db/schema';
import { AuditRepository, SYSTEM_ACTOR } from './audit.repository';

function makeDb() {
  const values = jest.fn().mockResolvedValue(undefined);
  const insert = jest.fn(() => ({ values }));
  return { db: { insert } as unknown as Database, insert, values };
}

describe('AuditRepository', () => {
  it('inserts one audit_log row, defaulting reason and metadata', async () => {
    const { db, insert, values } = makeDb();
    const repository = new AuditRepository(db);

    await repository.record({
      actor: { userId: 'u1', orgId: 'o1' },
      action: 'listing.created',
      entityType: 'listing',
      entityId: 'l1',
    });

    expect(insert).toHaveBeenCalledWith(auditLog);
    expect(values).toHaveBeenCalledWith({
      userId: 'u1',
      orgId: 'o1',
      action: 'listing.created',
      entityType: 'listing',
      entityId: 'l1',
      reason: '',
      metadata: {},
    });
  });

  it('passes reason and metadata through and accepts the system actor', async () => {
    const { db, values } = makeDb();
    const repository = new AuditRepository(db);

    await repository.record({
      actor: SYSTEM_ACTOR,
      action: 'claim.expired',
      entityType: 'claim',
      entityId: 'c1',
      reason: 'pickup window closed',
      metadata: { listingId: 'l1' },
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        orgId: null,
        reason: 'pickup window closed',
        metadata: { listingId: 'l1' },
      }),
    );
  });

  it('writes on the executor it is given (a transaction)', async () => {
    const { db, insert } = makeDb();
    const repository = new AuditRepository(db);
    const txValues = jest.fn().mockResolvedValue(undefined);
    const txInsert = jest.fn(() => ({ values: txValues }));
    const tx = { insert: txInsert } as unknown as Database;

    await repository.record(
      {
        actor: { userId: 'u1', orgId: 'o1' },
        action: 'claim.created',
        entityType: 'claim',
        entityId: 'c1',
      },
      tx,
    );

    expect(txInsert).toHaveBeenCalledWith(auditLog);
    expect(insert).not.toHaveBeenCalled();
  });
});
