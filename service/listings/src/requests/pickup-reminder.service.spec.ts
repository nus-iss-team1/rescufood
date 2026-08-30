import type { NotificationsPublisher } from '../notifications/notifications.publisher';
import { PickupReminderService } from './pickup-reminder.service';
import type { RequestsRepository } from './requests.repository';

function makeRepository() {
  return {
    markDuePickupReminders: jest.fn().mockResolvedValue([]),
    findPickupReminderTargets: jest.fn().mockResolvedValue([]),
  };
}

function makeNotifications() {
  return { pickupReminder: jest.fn().mockResolvedValue(undefined) };
}

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function make(repository: ReturnType<typeof makeRepository>) {
  const notifications = makeNotifications();
  const logger = makeLogger();
  const service = new PickupReminderService(
    repository as unknown as RequestsRepository,
    notifications as unknown as NotificationsPublisher,
    logger as never,
  );
  return { service, notifications, logger };
}

const target = {
  listingDescription: 'Bread',
  pickupLocation: 'Loc A',
  pickupWindowStart: new Date('2026-08-11T07:00:00Z'),
  pickupWindowEnd: new Date('2026-08-11T11:00:00Z'),
  rescueName: 'Alex Tan',
  rescueEmail: 'rescue@x.com',
  donorName: 'Priya Nair',
  donorEmail: 'donor@x.com',
};

describe('PickupReminderService', () => {
  it('runs both phases and does nothing when nothing is due', async () => {
    const repository = makeRepository();
    const { service, notifications } = make(repository);

    await service.sendPickupReminders();

    expect(repository.markDuePickupReminders).toHaveBeenCalledWith(
      'opening',
      expect.any(Date),
      24 * 60 * 60 * 1000,
    );
    expect(repository.markDuePickupReminders).toHaveBeenCalledWith(
      'closing',
      expect.any(Date),
      24 * 60 * 60 * 1000,
    );
    expect(notifications.pickupReminder).not.toHaveBeenCalled();
  });

  it('opening: emails both the rescue partner and the donor', async () => {
    const repository = makeRepository();
    repository.markDuePickupReminders.mockImplementation((phase: string) =>
      Promise.resolve(
        phase === 'opening' ? [{ id: 'r1', listingId: 'l1' }] : [],
      ),
    );
    repository.findPickupReminderTargets.mockResolvedValue([target]);
    const { service, notifications } = make(repository);

    await service.sendPickupReminders();

    expect(notifications.pickupReminder).toHaveBeenCalledWith(
      'rescue@x.com',
      expect.objectContaining({
        phase: 'opening',
        listingDescription: 'Bread',
        recipientName: 'Alex Tan',
      }),
    );
    expect(notifications.pickupReminder).toHaveBeenCalledWith(
      'donor@x.com',
      expect.objectContaining({
        phase: 'opening',
        recipientName: 'Priya Nair',
      }),
    );
  });

  it('closing: emails only the rescue partner', async () => {
    const repository = makeRepository();
    repository.markDuePickupReminders.mockImplementation((phase: string) =>
      Promise.resolve(
        phase === 'closing' ? [{ id: 'r1', listingId: 'l1' }] : [],
      ),
    );
    repository.findPickupReminderTargets.mockResolvedValue([target]);
    const { service, notifications } = make(repository);

    await service.sendPickupReminders();

    expect(notifications.pickupReminder).toHaveBeenCalledTimes(1);
    expect(notifications.pickupReminder).toHaveBeenCalledWith(
      'rescue@x.com',
      expect.objectContaining({ phase: 'closing' }),
    );
  });

  it('logs and swallows a repository failure', async () => {
    const repository = makeRepository();
    repository.markDuePickupReminders.mockRejectedValue(new Error('db down'));
    const { service, logger } = make(repository);

    await expect(service.sendPickupReminders()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
