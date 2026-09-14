import { randomUUID } from 'node:crypto';
import {
  closeTestPool,
  countRows,
  getNotificationRow,
  resetDb,
  seedNotification,
} from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';
import { IN_APP_FEED_LIMIT } from '../../src/notifications/notifications.repository';

let ctx: RepoContext;

beforeAll(async () => {
  ctx = await createRepoContext();
});

afterAll(async () => {
  await ctx.close();
  await closeTestPool();
});

beforeEach(resetDb);

const user = () => `sub-${randomUUID().slice(0, 8)}`;
const email = () => `user-${randomUUID().slice(0, 8)}@example.org`;

describe('NotificationsRepository (integration)', () => {
  describe('record + alreadyDelivered', () => {
    it('reports a sent email for the event as delivered, nothing else', async () => {
      const to = email();
      const eventId = randomUUID();
      await ctx.repository.record({
        recipientEmail: to,
        type: 'claim_created',
        channel: 'email',
        payload: {},
        status: 'sent',
        eventId,
      });

      expect(await ctx.repository.alreadyDelivered(eventId, 'email', to)).toBe(
        true,
      );
      expect(
        await ctx.repository.alreadyDelivered(eventId, 'email', email()),
      ).toBe(false);
      expect(
        await ctx.repository.alreadyDelivered(randomUUID(), 'email', to),
      ).toBe(false);
    });

    it('does not count a failed email as delivered', async () => {
      const to = email();
      const eventId = randomUUID();
      await ctx.repository.record({
        recipientEmail: to,
        type: 'claim_created',
        channel: 'email',
        payload: {},
        status: 'failed',
        failureReason: 'smtp down',
        eventId,
      });
      expect(await ctx.repository.alreadyDelivered(eventId, 'email', to)).toBe(
        false,
      );
    });
  });

  describe('createInApp', () => {
    it('is idempotent per (eventId, recipient)', async () => {
      const input = {
        recipientUserId: user(),
        recipientEmail: email(),
        type: 'claim_created' as const,
        eventId: randomUUID(),
        body: 'A partner reserved your listing.',
        payload: {},
      };

      expect(await ctx.repository.createInApp(input)).toBe('created');
      expect(await ctx.repository.createInApp(input)).toBe('duplicate');
      expect(await countRows()).toBe(1);
    });

    it('allows the same event for a different recipient', async () => {
      const eventId = randomUUID();
      const base = {
        recipientEmail: email(),
        type: 'claim_created' as const,
        eventId,
        body: 'body',
        payload: {},
      };
      expect(
        await ctx.repository.createInApp({ ...base, recipientUserId: user() }),
      ).toBe('created');
      expect(
        await ctx.repository.createInApp({ ...base, recipientUserId: user() }),
      ).toBe('created');
    });
  });

  describe('listInApp / countUnread', () => {
    it('returns the caller’s live in-app feed, newest first', async () => {
      const me = user();
      const older = await seedNotification({
        recipientUserId: me,
        createdAt: new Date(Date.now() - 60_000),
      });
      const newer = await seedNotification({
        recipientUserId: me,
        createdAt: new Date(),
      });
      await seedNotification({
        recipientUserId: me,
        deletedAt: new Date(),
      });
      await seedNotification({ recipientUserId: me, channel: 'email' });
      await seedNotification({ recipientUserId: user() });

      const feed = await ctx.repository.listInApp(me);
      expect(feed.map((n) => n.id)).toEqual([newer.id, older.id]);
      expect(await ctx.repository.countUnread(me)).toBe(2);
    });

    it('honours unreadOnly, before and limit', async () => {
      const me = user();
      await seedNotification({
        recipientUserId: me,
        readAt: new Date(),
        createdAt: new Date(Date.now() - 60_000),
      });
      const unread = await seedNotification({
        recipientUserId: me,
        createdAt: new Date(Date.now() - 30_000),
      });
      await seedNotification({
        recipientUserId: me,
        createdAt: new Date(),
      });

      expect(
        (await ctx.repository.listInApp(me, { unreadOnly: true })).map(
          (n) => n.id,
        ),
      ).toEqual(expect.arrayContaining([unread.id]));
      expect(await ctx.repository.listInApp(me, { limit: 1 })).toHaveLength(1);
      expect(
        await ctx.repository.listInApp(me, {
          before: new Date(Date.now() - 45_000),
        }),
      ).toHaveLength(1);
    });
  });

  describe('markRead / markAllRead', () => {
    it('marks one, is idempotent, and ignores other users', async () => {
      const me = user();
      const mine = await seedNotification({ recipientUserId: me });
      const theirs = await seedNotification({ recipientUserId: user() });

      const first = await ctx.repository.markRead(me, mine.id);
      expect(first?.readAt).toBeInstanceOf(Date);
      const again = await ctx.repository.markRead(me, mine.id);
      expect(again?.readAt).toEqual(first?.readAt);

      expect(await ctx.repository.markRead(me, theirs.id)).toBeNull();
      expect((await getNotificationRow(theirs.id))?.read_at).toBeNull();
    });

    it('markAllRead returns how many it flipped', async () => {
      const me = user();
      await seedNotification({ recipientUserId: me });
      await seedNotification({ recipientUserId: me });
      await seedNotification({ recipientUserId: me, readAt: new Date() });

      expect(await ctx.repository.markAllRead(me)).toBe(2);
      expect(await ctx.repository.markAllRead(me)).toBe(0);
    });
  });

  describe('deleteForUser / deleteAllForUser', () => {
    it('soft-deletes one, is idempotent, ignores other users', async () => {
      const me = user();
      const mine = await seedNotification({ recipientUserId: me });
      const theirs = await seedNotification({ recipientUserId: user() });

      expect(await ctx.repository.deleteForUser(me, mine.id)).toBe(true);
      expect(await ctx.repository.deleteForUser(me, mine.id)).toBe(true);
      expect((await getNotificationRow(mine.id))?.deleted_at).toBeInstanceOf(
        Date,
      );

      expect(await ctx.repository.deleteForUser(me, theirs.id)).toBe(false);
      expect((await getNotificationRow(theirs.id))?.deleted_at).toBeNull();
    });

    it('deleteAllForUser returns how many were still live', async () => {
      const me = user();
      await seedNotification({ recipientUserId: me });
      await seedNotification({ recipientUserId: me, deletedAt: new Date() });

      expect(await ctx.repository.deleteAllForUser(me)).toBe(1);
      expect(await ctx.repository.deleteAllForUser(me)).toBe(0);
    });
  });

  describe('trimInAppFeed', () => {
    it('keeps the newest IN_APP_FEED_LIMIT and soft-deletes the rest', async () => {
      const me = user();
      for (let i = 0; i < IN_APP_FEED_LIMIT + 3; i++) {
        await seedNotification({
          recipientUserId: me,
          createdAt: new Date(Date.now() - i * 1000),
        });
      }

      const trimmed = await ctx.repository.trimInAppFeed(me);
      expect(trimmed).toBe(3);
      expect(await ctx.repository.listInApp(me, { limit: 100 })).toHaveLength(
        IN_APP_FEED_LIMIT,
      );
      expect(await ctx.repository.trimInAppFeed(me)).toBe(0);
    });

    it('is a no-op below the cap', async () => {
      const me = user();
      await seedNotification({ recipientUserId: me });
      expect(await ctx.repository.trimInAppFeed(me)).toBe(0);
    });
  });
});
