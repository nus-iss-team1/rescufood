import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { buildQaListing } from './fixtures/listing-data';

// Cross-service claim history: a claim moves through its lifecycle and the
// rescue partner's requests history filters it under the right status. This
// drives the listings service's status-scoped request query, asserting the
// partner's own claim lands in the matching tab and not elsewhere.
test.describe.serial('Rescue partner claim history filters by status', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-history-${Date.now()}`;

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

  test('the fresh claim shows under the Active filter', async ({
    partnerPage,
  }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.gotoFiltered('active');
    await expect(requestsPage.rowFor(tag)).toBeVisible();
  });

  test('rescue partner can cancel the claim', async ({ partnerPage }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();
    await requestsPage.cancelClaimFor(tag);
    await expect(
      requestsPage.rowFor(tag).getByText('Cancelled', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('the cancelled claim moves into the Cancelled filter', async ({
    partnerPage,
  }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.gotoFiltered('cancelled');
    await expect(requestsPage.rowFor(tag)).toBeVisible();
  });

  test('the cancelled claim no longer shows under the Active filter', async ({
    partnerPage,
  }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.gotoFiltered('active');
    // The page rendered (its heading is present) but the settled claim is
    // filtered out - an empty match here means the filter excluded it, not
    // that the list hasn't loaded.
    await expect(requestsPage.rowFor(tag)).toHaveCount(0);
  });
});
