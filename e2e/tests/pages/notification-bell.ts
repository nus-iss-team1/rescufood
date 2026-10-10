import { type Page, type Locator, expect } from '@playwright/test';

/** The header's notification bell, on any signed-in page. */
export class NotificationBell {
  constructor(private readonly page: Page) {}

  // "Notifications, 3 unread", or just "Notifications" at zero. Anchored so
  // it can't match the toast region ("Notifications alt+T").
  private get trigger(): Locator {
    return this.page.getByRole('button', {
      name: /^Notifications(, \d+ unread)?$/,
    });
  }

  /** Unread count as the bell currently shows it. The bell re-polls this
   * every 5s without a reload. Capped in practice at 10 - see
   * markAllRead(). */
  async unreadCount(): Promise<number> {
    const label = await this.trigger.getAttribute('aria-label');
    const match = label?.match(/(\d+) unread/);
    return match ? Number(match[1]) : 0;
  }

  async open() {
    const panel = this.page.getByRole('dialog');
    // Opening is harmless, so a click lost to hydration can be retried.
    await expect(async () => {
      await this.trigger.click();
      await expect(panel).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  async close() {
    await this.page.keyboard.press('Escape');
    await expect(this.page.getByRole('dialog')).toBeHidden();
  }

  /** Clears the unread count to zero, so a new notification shows up as a
   * rise. The service keeps only the newest 10 per user, so a test account
   * whose feed is all unread sits at 10 however many more arrive. */
  async markAllRead() {
    const unread = await this.unreadCount();
    await this.open();
    // Only rendered once the feed has loaded, and only while something is
    // unread - so decide from the count, then let the click wait for it.
    if (unread > 0) {
      await this.page
        .getByRole('dialog')
        .getByRole('button', { name: 'Mark all read' })
        .click();
    }
    await expect(this.trigger).toHaveAccessibleName('Notifications', {
      timeout: 10_000,
    });
    await this.close();
  }

  /** The donor's "<partner> reserved "<listing>"." notification for the
   * tagged QA listing. */
  claimNotificationFor(tag: string): Locator {
    return this.page
      .getByRole('dialog')
      .getByRole('button', { name: new RegExp(`reserved ".*${tag}`) });
  }

  /** Marks one notification read with its own "Mark as read" button, which
   * sits beside the notification's main button in the same card. */
  async markRead(notification: Locator) {
    const card = notification.locator('xpath=..');
    const markRead = card.getByRole('button', { name: 'Mark as read' });
    await markRead.click();
    // The button only renders while the notification is unread.
    await expect(markRead).toHaveCount(0, { timeout: 10_000 });
  }
}
