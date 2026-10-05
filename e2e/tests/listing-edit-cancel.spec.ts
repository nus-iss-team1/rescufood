import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
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
    await donorPage.goto('/listings');
    await donorPage.waitForLoadState('networkidle');

    const row = donorPage.getByRole('listitem').filter({ hasText: tag });
    await expect(row).toBeVisible();

    // Same hydration race as the browse page link above - retrying the
    // click is safe, it's just a link.
    await expect(async () => {
      await row.getByRole('link', { name: 'View / Edit' }).click();
      await donorPage.waitForURL(/\/listings\/[^/]+$/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await donorPage.waitForLoadState('networkidle');

    await donorPage
      .getByLabel('Handling info')
      .fill(`Updated by automated QA edit ${tag}`);
    await donorPage.getByRole('button', { name: 'Save changes' }).click();

    await expect(donorPage.getByText('Listing updated successfully!')).toBeVisible(
      { timeout: 10_000 },
    );
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

  test('rescue partner can claim the tagged QA listing', async ({ partnerPage }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await browsePage.openListing(tag);
    await browsePage.claim();
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

  // TODO: once the donor UI exposes a "Delete listing" action (the
  // deleteListing API client already exists in
  // web/platform/src/lib/listings.ts, it's just not wired to any button
  // yet), add a final step here where the donor deletes this tagged
  // listing to fully clean up after the run.
});
