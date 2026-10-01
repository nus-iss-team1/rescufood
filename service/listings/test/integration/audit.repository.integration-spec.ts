import {
  closeTestPool,
  resetDb,
  seedDonor,
  seedListing,
  seedUser,
  testPool,
} from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';

let ctx: RepoContext;

beforeAll(async () => {
  ctx = await createRepoContext();
});

afterAll(async () => {
  await ctx.close();
  await closeTestPool();
});

beforeEach(resetDb);

async function seedListingWithActor() {
  const { org, user } = await seedDonor();
  const listing = await seedListing({
    donorOrgId: org.id,
    createdBy: user.id,
  });
  return { actor: { userId: user.id, orgId: org.id }, listing };
}

// Inserts an audit row at an exact created_at, which record() cannot do -
// it relies on the column's now() default.
async function recordAt(args: {
  at: string;
  action: string;
  entityId: string;
  userId: string | null;
  orgId: string | null;
}): Promise<void> {
  await testPool().query(
    `INSERT INTO audit_log
       (user_id, org_id, action, entity_type, entity_id, created_at)
     VALUES ($1, $2, $3, 'listing', $4, $5)`,
    [args.userId, args.orgId, args.action, args.entityId, args.at],
  );
}

describe('AuditRepository.findByEntity (integration)', () => {
  it('returns only the named entity, oldest first', async () => {
    const { actor, listing } = await seedListingWithActor();
    const other = await seedListing({
      donorOrgId: actor.orgId,
      createdBy: actor.userId,
    });

    for (const action of [
      'listing.created',
      'listing.published',
      'listing.cancelled',
    ]) {
      await ctx.audit.record({
        actor,
        action,
        entityType: 'listing',
        entityId: listing.id,
      });
    }
    await ctx.audit.record({
      actor,
      action: 'listing.created',
      entityType: 'listing',
      entityId: other.id,
    });

    const page = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 50,
      offset: 0,
    });

    expect(page.total).toBe(3);
    expect(page.items.map((e) => e.action)).toEqual([
      'listing.created',
      'listing.published',
      'listing.cancelled',
    ]);
  });

  it('orders rows written in one transaction identically on every call', async () => {
    const { actor, listing } = await seedListingWithActor();

    // created_at is transaction-start time, so these three tie on it -
    // the id tiebreak is what keeps the order stable.
    await ctx.db.transaction(async (tx) => {
      await ctx.audit.record(
        { actor, action: 'a', entityType: 'listing', entityId: listing.id },
        tx,
      );
      await ctx.audit.record(
        { actor, action: 'b', entityType: 'listing', entityId: listing.id },
        tx,
      );
      await ctx.audit.record(
        { actor, action: 'c', entityType: 'listing', entityId: listing.id },
        tx,
      );
    });

    const page = () =>
      ctx.audit.findByEntity('listing', listing.id, { limit: 50, offset: 0 });
    const first = await page();
    const second = await page();

    expect(new Set(first.items.map((e) => e.createdAt.getTime())).size).toBe(1);
    expect(first.items.map((e) => e.id)).toEqual(second.items.map((e) => e.id));
  });

  it('pages without dropping or repeating a row', async () => {
    const { actor, listing } = await seedListingWithActor();
    for (let i = 0; i < 5; i += 1) {
      await ctx.audit.record({
        actor,
        action: `listing.step-${i}`,
        entityType: 'listing',
        entityId: listing.id,
      });
    }

    const first = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 2,
      offset: 0,
    });
    const second = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 2,
      offset: 2,
    });
    const third = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 2,
      offset: 4,
    });

    expect(first.total).toBe(5);
    expect(
      [...first.items, ...second.items, ...third.items].map((e) => e.id),
    ).toHaveLength(5);
    expect(
      new Set(
        [...first.items, ...second.items, ...third.items].map((e) => e.id),
      ).size,
    ).toBe(5);
  });

  it('leaves a recorded event untouched when the listing changes later', async () => {
    const { actor, listing } = await seedListingWithActor();
    await ctx.audit.record({
      actor,
      action: 'listing.created',
      entityType: 'listing',
      entityId: listing.id,
      metadata: { status: 'available' },
    });
    const before = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 50,
      offset: 0,
    });

    await ctx.listings.delete(listing.id, listing.version + 1);

    const after = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 50,
      offset: 0,
    });
    expect(after.items).toEqual(before.items);
  });

  it('returns an empty page for an entity with no events', async () => {
    const { listing } = await seedListingWithActor();

    const page = await ctx.audit.findByEntity('claim', listing.id, {
      limit: 50,
      offset: 0,
    });

    expect(page).toEqual({ items: [], total: 0 });
  });

  it('narrows to one actor, excluding system events', async () => {
    const { actor, listing } = await seedListingWithActor();
    const other = await seedUser({ orgId: actor.orgId });

    await ctx.audit.record({
      actor,
      action: 'listing.published',
      entityType: 'listing',
      entityId: listing.id,
    });
    await ctx.audit.record({
      actor: { userId: other.id, orgId: actor.orgId },
      action: 'listing.updated',
      entityType: 'listing',
      entityId: listing.id,
    });
    await ctx.audit.record({
      actor: { userId: null, orgId: null },
      action: 'listing.expired',
      entityType: 'listing',
      entityId: listing.id,
    });

    const mine = await ctx.audit.findByEntity('listing', listing.id, {
      userId: actor.userId,
      limit: 50,
      offset: 0,
    });

    expect(mine.total).toBe(1);
    expect(mine.items.map((e) => e.action)).toEqual(['listing.published']);
  });

  it('bounds the timestamp range inclusively at both ends', async () => {
    const { actor, listing } = await seedListingWithActor();
    for (const [at, action] of [
      ['2026-01-01T00:00:00.000Z', 'before'],
      ['2026-01-10T00:00:00.000Z', 'lower-edge'],
      ['2026-01-20T00:00:00.000Z', 'inside'],
      ['2026-01-31T00:00:00.000Z', 'upper-edge'],
      ['2026-02-05T00:00:00.000Z', 'after'],
    ]) {
      await recordAt({
        at,
        action,
        entityId: listing.id,
        userId: actor.userId,
        orgId: actor.orgId,
      });
    }

    const page = await ctx.audit.findByEntity('listing', listing.id, {
      createdAtFrom: '2026-01-10T00:00:00.000Z',
      createdAtTo: '2026-01-31T00:00:00.000Z',
      limit: 50,
      offset: 0,
    });

    expect(page.total).toBe(3);
    expect(page.items.map((e) => e.action)).toEqual([
      'lower-edge',
      'inside',
      'upper-edge',
    ]);
  });

  it('combines the actor and range filters', async () => {
    const { actor, listing } = await seedListingWithActor();
    const other = await seedUser({ orgId: actor.orgId });

    await recordAt({
      at: '2026-01-15T00:00:00.000Z',
      action: 'mine-inside',
      entityId: listing.id,
      userId: actor.userId,
      orgId: actor.orgId,
    });
    await recordAt({
      at: '2026-01-15T00:00:00.000Z',
      action: 'theirs-inside',
      entityId: listing.id,
      userId: other.id,
      orgId: actor.orgId,
    });
    await recordAt({
      at: '2026-03-01T00:00:00.000Z',
      action: 'mine-outside',
      entityId: listing.id,
      userId: actor.userId,
      orgId: actor.orgId,
    });

    const page = await ctx.audit.findByEntity('listing', listing.id, {
      userId: actor.userId,
      createdAtFrom: '2026-01-01T00:00:00.000Z',
      createdAtTo: '2026-01-31T00:00:00.000Z',
      limit: 50,
      offset: 0,
    });

    expect(page.items.map((e) => e.action)).toEqual(['mine-inside']);
    expect(page.total).toBe(1);
  });

  it('counts the filtered set, not the whole history', async () => {
    const { actor, listing } = await seedListingWithActor();
    for (let i = 0; i < 4; i += 1) {
      await recordAt({
        at: `2026-0${i + 1}-01T00:00:00.000Z`,
        action: `step-${i}`,
        entityId: listing.id,
        userId: actor.userId,
        orgId: actor.orgId,
      });
    }

    const filtered = await ctx.audit.findByEntity('listing', listing.id, {
      createdAtFrom: '2026-03-01T00:00:00.000Z',
      limit: 1,
      offset: 0,
    });

    expect(filtered.total).toBe(2);
    expect(filtered.items).toHaveLength(1);
  });
});

describe('AuditRepository.findMany (integration)', () => {
  it('returns every entity type newest first when unfiltered', async () => {
    const { actor, listing } = await seedListingWithActor();

    await recordAt({
      at: '2026-01-01T00:00:00.000Z',
      action: 'oldest',
      entityId: listing.id,
      userId: actor.userId,
      orgId: actor.orgId,
    });
    await recordAt({
      at: '2026-01-02T00:00:00.000Z',
      action: 'newest',
      entityId: listing.id,
      userId: actor.userId,
      orgId: actor.orgId,
    });
    await ctx.audit.record({
      actor,
      action: 'claim.created',
      entityType: 'claim',
      entityId: listing.id,
    });

    const page = await ctx.audit.findMany({ limit: 50, offset: 0 });

    expect(page.total).toBe(3);
    expect(page.items[0].action).toBe('claim.created');
    expect(page.items.map((e) => e.action)).toEqual([
      'claim.created',
      'newest',
      'oldest',
    ]);
  });

  it('narrows to one entity type', async () => {
    const { actor, listing } = await seedListingWithActor();
    await ctx.audit.record({
      actor,
      action: 'listing.published',
      entityType: 'listing',
      entityId: listing.id,
    });
    await ctx.audit.record({
      actor,
      action: 'claim.created',
      entityType: 'claim',
      entityId: listing.id,
    });

    const claims = await ctx.audit.findMany({
      entityType: 'claim',
      limit: 50,
      offset: 0,
    });

    expect(claims.total).toBe(1);
    expect(claims.items[0].action).toBe('claim.created');
  });

  it('spans entities within a timestamp range', async () => {
    const { actor, listing } = await seedListingWithActor();
    const other = await seedListing({
      donorOrgId: actor.orgId,
      createdBy: actor.userId,
    });

    await recordAt({
      at: '2026-01-05T00:00:00.000Z',
      action: 'first-listing',
      entityId: listing.id,
      userId: actor.userId,
      orgId: actor.orgId,
    });
    await recordAt({
      at: '2026-01-06T00:00:00.000Z',
      action: 'second-listing',
      entityId: other.id,
      userId: actor.userId,
      orgId: actor.orgId,
    });
    await recordAt({
      at: '2026-03-01T00:00:00.000Z',
      action: 'out-of-range',
      entityId: other.id,
      userId: actor.userId,
      orgId: actor.orgId,
    });

    const page = await ctx.audit.findMany({
      createdAtFrom: '2026-01-01T00:00:00.000Z',
      createdAtTo: '2026-01-31T00:00:00.000Z',
      limit: 50,
      offset: 0,
    });

    expect(page.total).toBe(2);
    expect(page.items.map((e) => e.action)).toEqual([
      'second-listing',
      'first-listing',
    ]);
    expect(new Set(page.items.map((e) => e.entityId)).size).toBe(2);
  });

  it('narrows to one actor across entities', async () => {
    const { actor, listing } = await seedListingWithActor();
    const other = await seedUser({ orgId: actor.orgId });

    await ctx.audit.record({
      actor,
      action: 'mine',
      entityType: 'listing',
      entityId: listing.id,
    });
    await ctx.audit.record({
      actor: { userId: other.id, orgId: actor.orgId },
      action: 'theirs',
      entityType: 'listing',
      entityId: listing.id,
    });

    const page = await ctx.audit.findMany({
      userId: actor.userId,
      limit: 50,
      offset: 0,
    });

    expect(page.items.map((e) => e.action)).toEqual(['mine']);
    expect(page.total).toBe(1);
  });
});

// A retained event does not change when the record it describes does.
// Enforced by the trigger in migration 0018, not by convention, so these
// assert against the database rather than against the repository surface.
describe('audit_log is append-only (integration)', () => {
  it('rejects an update to a retained event', async () => {
    const { actor, listing } = await seedListingWithActor();
    await ctx.audit.record({
      actor,
      action: 'listing.created',
      entityType: 'listing',
      entityId: listing.id,
      reason: 'as entered',
    });

    await expect(
      testPool().query(`UPDATE audit_log SET reason = 'rewritten'`),
    ).rejects.toThrow(/append-only/);

    const page = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 50,
      offset: 0,
    });
    expect(page.items.map((e) => e.reason)).toEqual(['as entered']);
  });

  it('rejects a delete of a retained event', async () => {
    const { actor, listing } = await seedListingWithActor();
    await ctx.audit.record({
      actor,
      action: 'listing.created',
      entityType: 'listing',
      entityId: listing.id,
    });

    await expect(
      testPool().query(`DELETE FROM audit_log`),
    ).rejects.toThrow(/append-only/);

    const page = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 50,
      offset: 0,
    });
    expect(page.total).toBe(1);
  });

  it('keeps a listing event after the listing itself is deleted', async () => {
    const { actor, listing } = await seedListingWithActor();
    await ctx.audit.record({
      actor,
      action: 'listing.deleted',
      entityType: 'listing',
      entityId: listing.id,
    });

    await testPool().query(`DELETE FROM listings WHERE id = $1`, [listing.id]);

    const page = await ctx.audit.findByEntity('listing', listing.id, {
      limit: 50,
      offset: 0,
    });
    expect(page.items.map((e) => e.action)).toEqual(['listing.deleted']);
  });
});

// An event whose subject has no record to point at.
describe('audit_log subject-only events (integration)', () => {
  it('round-trips an event with no entity_id', async () => {
    await testPool().query(
      `INSERT INTO audit_log (action, entity_type, subject, metadata)
       VALUES ('auth.login_failed', 'user', 'nobody@example.com', '{}')`,
    );

    const page = await ctx.audit.findMany({
      entityType: 'user',
      limit: 50,
      offset: 0,
    });

    expect(page.total).toBe(1);
    expect(page.items[0].entityId).toBeNull();
    expect(page.items[0].subject).toBe('nobody@example.com');
  });
});
