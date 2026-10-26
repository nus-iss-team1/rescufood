import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { buildQaListing } from './fixtures/listing-data';

// Cross-service claim cancellation: a rescue partner withdraws an active
// claim and both roles see it settle as cancelled. (Whether the lot relists
// depends on the cancellation cutoff, which the default pickup window can
// fall either side of, so this asserts the cancellation outcome itself, not
// the relist - see listing-edit-cancel.spec.ts for the late-cancel path.)
test.describe.serial('Rescue partner cancels an active claim', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-claim-cancel-${Date.now()}`;

  test('donor can post a tagged QA listing', async ({ donorPage }) => {
    const listingFormPage = new ListingFormPage(donorPage);
    await listingFormPage.goto();
    await listingFormPage.publish(buildQaListing(tag));
  });

  test('rescue partner can claim the tagged QA listing', async ({
    partnerPage,
  }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await browsePage.openListing(tag);
    await browsePage.claim();
  });

  test('rescue partner can cancel the active claim', async ({ partnerPage }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();
    await expect(requestsPage.rowFor(tag).getByText('Active')).toBeVisible();

    await requestsPage.cancelClaimFor(tag);

    // Exact: the row also shows a "Cancelled on <date>" line.
    await expect(
      requestsPage.rowFor(tag).getByText('Cancelled', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('donor sees the claim cancelled on the request detail', async ({
    donorPage,
  }) => {
    const requestsPage = new RequestsPage(donorPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    // The partner cancelled, so the donor's view reads "Claim cancelled"
    // (a donor-initiated withdrawal would read "Failed Collection").
    await expect(
      donorPage.getByText('Claim cancelled', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
