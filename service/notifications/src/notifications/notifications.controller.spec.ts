import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsController } from './notifications.controller';
import type { NotificationsRepository } from './notifications.repository';

// notifications.controller.ts pulls in JwtAuthGuard, which imports `jose`
// (ESM - ts-jest can't parse it). The guard is only referenced for decorator
// metadata here, never instantiated, so a stub satisfies the import.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

function reqAs(userId: string): Request {
  return { user: { userId, role: 'user' } } as unknown as Request;
}

describe('NotificationsController', () => {
  let repository: {
    listInApp: jest.Mock;
    countUnread: jest.Mock;
    markRead: jest.Mock;
    markAllRead: jest.Mock;
  };
  let controller: NotificationsController;

  beforeEach(() => {
    repository = {
      listInApp: jest.fn().mockResolvedValue([{ id: 'n1' }]),
      countUnread: jest.fn().mockResolvedValue(3),
      markRead: jest.fn().mockResolvedValue({ readAt: new Date('2026-01-01') }),
      markAllRead: jest.fn().mockResolvedValue(2),
    };
    controller = new NotificationsController(
      repository as unknown as NotificationsRepository,
    );
  });

  it('lists the caller’s notifications with the unread count', async () => {
    const result = await controller.list(reqAs('sub-1'), {
      unreadOnly: true,
      limit: 10,
    });

    expect(repository.listInApp).toHaveBeenCalledWith('sub-1', {
      unreadOnly: true,
      limit: 10,
      before: undefined,
    });
    expect(result).toEqual({ items: [{ id: 'n1' }], unreadCount: 3 });
  });

  it('returns the unread count', async () => {
    expect(await controller.unreadCount(reqAs('sub-1'))).toEqual({ count: 3 });
    expect(repository.countUnread).toHaveBeenCalledWith('sub-1');
  });

  it('marks one notification read, scoped to the caller', async () => {
    const result = await controller.markRead(reqAs('sub-1'), 'n1');
    expect(repository.markRead).toHaveBeenCalledWith('sub-1', 'n1');
    expect(result).toEqual({ id: 'n1', readAt: new Date('2026-01-01') });
  });

  it('404s when the notification is not the caller’s', async () => {
    repository.markRead.mockResolvedValueOnce(null);
    await expect(
      controller.markRead(reqAs('sub-2'), 'n1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks all read', async () => {
    expect(await controller.markAllRead(reqAs('sub-1'))).toEqual({
      updated: 2,
    });
    expect(repository.markAllRead).toHaveBeenCalledWith('sub-1');
  });
});
