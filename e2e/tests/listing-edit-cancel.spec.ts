import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { YourListingsPage } from './pages/your-listings-page';
import { ListingEditPage } from './pages/listing-edit-page';
import { NotificationBell } from './pages/notification-bell';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { buildQaListing } from './fixtures/listing-data';

test.describe.serial('Listing claim lifecycle', () => {
  // Unique per run so the rescue partner steps can find this exact listing
  // among whatever else is already on /browse.
  const tag = `qa-${Date.now()}`;

  test('donor can post a tagged QA listing', async ({ donorPage }) => {
    const listingFormPage = new ListingFormPage(donorPage);
    await listingFormPage.goto();
    await listingFormPage.publish(buildQaListing(tag));
  });

  test('donor can edit the tagged QA listing', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await yourListings.openEdit(tag);

    const editPage = new ListingEditPage(donorPage);
    await editPage.fillHandlingInfo(`Updated by automated QA edit ${tag}`);
    await editPage.save();
  });

  test('rescue partner can view listings', async ({ partnerPage }) => {
    // Same controlled-input hydration race as the donor form - safer to
    // wait for the page to settle before reading rendered content.
    await new BrowsePage(partnerPage).goto();

    await expect(
      partnerPage.getByRole('heading', { name: 'Find surplus food' }),
    ).toBeVisible();
    // At least one available listing renders with its own details link -
    // proof the browse page actually loaded real data, not just the shell.
    await expect(
      partnerPage.getByRole('link', { name: 'View Details' }).first(),
    ).toBeVisible();
  });

  test('rescue partner can view the tagged QA listing', async ({ partnerPage }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await browsePage.openListing(tag);

    // The detail page renders the listing description as a heading twice
    // (page title + detail card title) - either instance proves the right
    // listing loaded.
    await expect(
      partnerPage.getByRole('heading', { name: new RegExp(tag) }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // Both roles at once: the donor sits on the dashboard in a session of
  // their own while the rescue partner claims. Lives in this spec rather
  // than the pickup one so a notification failure only skips the cancel
  // steps after it, not the pickup flow.
  test('rescue partner can claim the tagged QA listing, and the donor is notified live', async ({
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

    // The count can't say which notification arrived; the feed can.
    await bell.open();
    const notification = bell.claimNotificationFor(tag);
    await expect(notification).toBeVisible({ timeout: 10_000 });
    await bell.markRead(notification);
  });

  test('rescue partner can cancel the claimed request', async ({ partnerPage }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();

    const request = requestsPage.rowFor(tag);
    await expect(request.getByText('Active')).toBeVisible();

    // Opens a confirmation dialog first; the real submit lives inside it.
    await request.getByRole('button', { name: 'Cancel', exact: true }).click();
    await partnerPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Cancel claim' })
      .click();

    await expect(request.getByText('Cancelled')).toBeVisible({ timeout: 10_000 });
  });

  // The listings service keeps any listing that has had a request, even a
  // cancelled one, for audit history - so this run's listing can't be
  // cleaned up by deleting it. (Deleting is covered in
  // listing-draft-delete.spec.ts, on a listing that's never claimed.)
  test('donor cannot delete a listing that has had a request', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await yourListings.delete(tag);

    const notifications = donorPage.getByLabel(/Notifications/i);
    await expect(notifications.getByText('Could not delete listing')).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      notifications.getByText('This listing has associated requests and cannot be deleted.'),
    ).toBeVisible();

    await yourListings.goto();
    await expect(yourListings.rowFor(tag)).toBeVisible();
  });

  // Cancelling the claim put the listing back on offer. Withdrawing it is
  // the cleanup available instead, so rescue partners stop seeing it.
  test('donor can withdraw the listing', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await yourListings.openEdit(tag);

    const editPage = new ListingEditPage(donorPage);
    await editPage.setStatus('Cancelled');
    await editPage.save();
  });

  test('rescue partner no longer sees the withdrawn listing', async ({ partnerPage }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(
      partnerPage.getByRole('heading', { name: 'Find surplus food' }),
    ).toBeVisible();
    await expect(browsePage.cardFor(tag)).toHaveCount(0);
  });
});
