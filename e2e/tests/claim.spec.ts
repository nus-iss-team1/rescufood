import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { YourListingsPage } from './pages/your-listings-page';
import { ListingEditPage } from './pages/listing-edit-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { buildQaListing } from './fixtures/listing-data';

// Cross-service claim flow: a rescue partner reserves an available listing
// and the donor sees it reserved. The listing lifecycle specs touch the
// claim as one step among many; this one isolates the reserve-and-reflect
// contract between browse (listings) and the donor's own views.
test.describe.serial('Rescue partner claims an available listing', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-claim-${Date.now()}`;

  test('donor can post a tagged QA listing', async ({ donorPage }) => {
    const listingFormPage = new ListingFormPage(donorPage);
    await listingFormPage.goto();
    await listingFormPage.publish(buildQaListing(tag));
  });

  test('rescue partner sees the listing available on browse', async ({
    partnerPage,
  }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(browsePage.cardFor(tag)).toBeVisible();
  });

  test('rescue partner can claim the tagged QA listing', async ({
    partnerPage,
  }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await browsePage.openListing(tag);
    await browsePage.claim();
  });

  test('rescue partner sees an active request for the claim', async ({
    partnerPage,
  }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();
    await expect(requestsPage.rowFor(tag).getByText('Active')).toBeVisible();
  });

  test('claimed listing is no longer offered on browse', async ({
    partnerPage,
  }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(
      partnerPage.getByRole('heading', { name: 'Find surplus food' }),
    ).toBeVisible();
    await expect(browsePage.cardFor(tag)).toHaveCount(0);
  });

  test('donor sees the claimed listing reserved and locked', async ({
    donorPage,
  }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    // The donor's own list shows the reservation; a reserved listing opens
    // read-only (the edit form refuses it).
    await expect(yourListings.rowFor(tag)).toBeVisible();
    await yourListings.openEdit(tag);
    await new ListingEditPage(donorPage).expectLocked();
  });
});
