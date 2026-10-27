import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { PickupVerificationPage } from './pages/pickup-verification-page';
import { NotificationBell } from './pages/notification-bell';
import { buildQaListing } from './fixtures/listing-data';

// Cross-service notification delivery through the UI: a claim and a pickup
// each flow through a queue to the notification service, and the recipient
// sees the matching in-app notification in the header bell. Email can only
// be checked indirectly, so this asserts the in-app feed (the one surface a
// black-box test can observe). The claim notification lands on the donor;
// the pickup-completed notification lands on the rescue partner.
test.describe.serial('In-app notification delivery', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-notify-${Date.now()}`;
  let code: string;

  test('donor can post a tagged QA listing', async ({ donorPage }) => {
    const listingFormPage = new ListingFormPage(donorPage);
    await listingFormPage.goto();
    await listingFormPage.publish(buildQaListing(tag));
  });

  // Both roles at once: the donor sits with a cleared bell while the partner
  // claims, so the arriving notification shows up as a rise, not lost among
  // older unread ones.
  test('donor is notified in-app when the partner claims', async ({
    donorPage,
    partnerPage,
  }) => {
    await donorPage.goto('/dashboard');
    await donorPage.waitForLoadState('networkidle');
    const bell = new NotificationBell(donorPage);
    await bell.markAllRead();

    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await browsePage.openListing(tag);
    await browsePage.claim();

    // No reload: the bell re-polls its count every 5s, after the
    // notification has gone through a queue to the notification service.
    await expect
      .poll(() => bell.unreadCount(), { timeout: 30_000 })
      .toBeGreaterThan(0);

    await bell.open();
    const notification = bell.claimNotificationFor(tag);
    await expect(notification).toBeVisible({ timeout: 10_000 });
    await bell.markRead(notification);
    await bell.close();
  });

  test('rescue partner can generate a pickup code', async ({ partnerPage }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    code = await new PickupVerificationPage(partnerPage).generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  // Again both roles at once: the partner holds a cleared bell while the
  // donor confirms the pickup, so the completion notification is visible as
  // a fresh arrival.
  test('rescue partner is notified in-app when the donor confirms pickup', async ({
    donorPage,
    partnerPage,
  }) => {
    const bell = new NotificationBell(partnerPage);
    await partnerPage.goto('/dashboard');
    await partnerPage.waitForLoadState('networkidle');
    await bell.markAllRead();

    const requestsPage = new RequestsPage(donorPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);
    const pickupPage = new PickupVerificationPage(donorPage);
    await pickupPage.openCodeDialog();
    await pickupPage.submitCode(code);
    await expect(
      donorPage.getByLabel(/Notifications/i).getByText('Pickup completed'),
    ).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(() => bell.unreadCount(), { timeout: 30_000 })
      .toBeGreaterThan(0);

    await bell.open();
    const notification = bell.pickupCompletedNotificationFor(tag);
    await expect(notification).toBeVisible({ timeout: 10_000 });
    await bell.markRead(notification);
    await bell.close();
  });
});
