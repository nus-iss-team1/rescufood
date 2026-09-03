import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  closeTestPool,
  getNotificationRow,
  resetDb,
  seedNotification,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';

interface FeedResponse {
  items: { id: string; readAt: string | null }[];
  unreadCount: number;
}

let harness: TestApp;

beforeAll(async () => {
  harness = await createTestApp();
});

afterAll(async () => {
  await harness.close();
  await closeTestPool();
});

beforeEach(resetDb);

const sub = () => `sub-${randomUUID().slice(0, 8)}`;

describe('Notifications HTTP (integration)', () => {
  it('returns the caller’s own feed and unread count', async () => {
    const me = sub();
    await seedNotification({ recipientUserId: me });
    await seedNotification({ recipientUserId: me, readAt: new Date() });
    await seedNotification({ recipientUserId: sub() });

    const res = await request(harness.server)
      .get('/api/notifications')
      .set(authHeaders(me))
      .expect(200);

    const feed = body<FeedResponse>(res);
    expect(feed.items).toHaveLength(2);
    expect(feed.unreadCount).toBe(1);
  });

  it('401s without an auth header', async () => {
    await request(harness.server).get('/api/notifications').expect(401);
  });

  it('marks one read, and 404s another user’s notification', async () => {
    const me = sub();
    const mine = await seedNotification({ recipientUserId: me });
    const theirs = await seedNotification({ recipientUserId: sub() });

    await request(harness.server)
      .post(`/api/notifications/${mine.id}/read`)
      .set(authHeaders(me))
      .expect(201);
    expect((await getNotificationRow(mine.id))?.read_at).toBeInstanceOf(Date);

    await request(harness.server)
      .post(`/api/notifications/${theirs.id}/read`)
      .set(authHeaders(me))
      .expect(404);
  });

  it('read-all reports how many it flipped', async () => {
    const me = sub();
    await seedNotification({ recipientUserId: me });
    await seedNotification({ recipientUserId: me });

    const res = await request(harness.server)
      .post('/api/notifications/read-all')
      .set(authHeaders(me))
      .expect(201);
    expect(body<{ updated: number }>(res).updated).toBe(2);
  });

  it('soft-deletes one (204) and 404s another user’s', async () => {
    const me = sub();
    const mine = await seedNotification({ recipientUserId: me });
    const theirs = await seedNotification({ recipientUserId: sub() });

    await request(harness.server)
      .delete(`/api/notifications/${mine.id}`)
      .set(authHeaders(me))
      .expect(204);
    expect((await getNotificationRow(mine.id))?.deleted_at).toBeInstanceOf(
      Date,
    );

    await request(harness.server)
      .delete(`/api/notifications/${theirs.id}`)
      .set(authHeaders(me))
      .expect(404);
  });

  it('unread-count endpoint is caller-scoped', async () => {
    const me = sub();
    await seedNotification({ recipientUserId: me });
    await seedNotification({ recipientUserId: me, deletedAt: new Date() });

    const res = await request(harness.server)
      .get('/api/notifications/unread-count')
      .set(authHeaders(me))
      .expect(200);
    expect(body<{ count: number }>(res).count).toBe(1);
  });
});
