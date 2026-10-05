import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { YourListingsPage } from './pages/your-listings-page';
import { ListingEditPage } from './pages/listing-edit-page';
import { BrowsePage } from './pages/browse-page';
import { buildQaListing } from './fixtures/listing-data';

// The listing here is never claimed, so it can be deleted at the end - the
// listings service refuses to delete one that has ever had a request.
test.describe.serial('Listing draft, publish and delete', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-draft-${Date.now()}`;

  test('donor can save a tagged QA listing as a draft', async ({ donorPage }) => {
    const listingFormPage = new ListingFormPage(donorPage);
    await listingFormPage.goto();
    await listingFormPage.saveDraft(buildQaListing(tag));
  });

  test('rescue partner cannot see the draft', async ({ partnerPage }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(
      partnerPage.getByRole('heading', { name: 'Find surplus food' }),
    ).toBeVisible();
    await expect(browsePage.cardFor(tag)).toHaveCount(0);
  });

  test('donor can publish the draft', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await yourListings.openEdit(tag);

    const editPage = new ListingEditPage(donorPage);
    await editPage.setStatus('Available (published)');
    await editPage.save();
  });

  test('rescue partner can see the published listing', async ({ partnerPage }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(browsePage.cardFor(tag)).toBeVisible();
  });

  test('donor can delete the listing', async ({ donorPage }) => {
    const yourListings = new YourListingsPage(donorPage);
    await yourListings.goto();
    await yourListings.delete(tag);

    await expect(
      donorPage.getByLabel(/Notifications/i).getByText('Listing deleted'),
    ).toBeVisible({ timeout: 10_000 });
    await expect(yourListings.rowFor(tag)).toHaveCount(0);
  });

  test('rescue partner no longer sees the deleted listing', async ({ partnerPage }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await expect(
      partnerPage.getByRole('heading', { name: 'Find surplus food' }),
    ).toBeVisible();
    await expect(browsePage.cardFor(tag)).toHaveCount(0);
  });
});
