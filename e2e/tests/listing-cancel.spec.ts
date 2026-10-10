import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { YourListingsPage } from './pages/your-listings-page';
import { ListingEditPage } from './pages/listing-edit-page';
import { BrowsePage } from './pages/browse-page';
import { buildQaListing } from './fixtures/listing-data';

// The listing here is never claimed, so it can be deleted at the end.
test.describe.serial('Donor cancels an unclaimed listing', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-cancel-${Date.now()}`;

  test('donor can post a tagged QA listing', async ({ donorPage }) => {
    const listingFormPage = new ListingFormPage(donorPage);
    await listingFormPage.goto();
    await listingFormPage.publish(buildQaListing(tag));
  });

  test('rescue partner can see the listing', async ({ partnerPage }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(browsePage.cardFor(tag)).toBeVisible();
  });

  test('donor can cancel the listing', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await yourListings.openEdit(tag);

    const editPage = new ListingEditPage(donorPage);
    await editPage.setStatus('Cancelled');
    await editPage.fillCancellationReason('QA run: no longer available');
    await editPage.save();
  });

  test('donor sees the listing cancelled and locked', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await expect(yourListings.rowFor(tag).getByText('Cancelled')).toBeVisible();
    await yourListings.openEdit(tag);

    await new ListingEditPage(donorPage).expectLocked();
  });

  test('rescue partner no longer sees the cancelled listing', async ({
    partnerPage,
  }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(
      partnerPage.getByRole('heading', { name: 'Find surplus food' }),
    ).toBeVisible();
    await expect(browsePage.cardFor(tag)).toHaveCount(0);
  });

  test('donor can delete the cancelled listing', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await yourListings.delete(tag);

    await expect(
      donorPage.getByLabel(/Notifications/i).getByText('Listing deleted'),
    ).toBeVisible({ timeout: 10_000 });
    await expect(yourListings.rowFor(tag)).toHaveCount(0);
  });
});
