import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { PickupVerificationPage } from './pages/pickup-verification-page';
import { buildQaListing } from './fixtures/listing-data';

// Cross-service no-show: the rescue partner claims but never collects, and
// the donor reports the no-show once the pickup window has opened. The
// listing is published with an already-open window so the donor's "Report
// No-Show" control is live (it stays disabled until the window starts).
test.describe.serial('Donor reports a rescue-partner no-show', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-no-show-${Date.now()}`;

  test('donor can post a tagged QA listing with an open pickup window', async ({
    donorPage,
  }) => {
    const listingFormPage = new ListingFormPage(donorPage);
    await listingFormPage.goto();
    await listingFormPage.publishWithOpenPickupWindow(buildQaListing(tag));
  });

  test('rescue partner can claim the tagged QA listing', async ({
    partnerPage,
  }) => {
    const browsePage = new BrowsePage(partnerPage);
    await browsePage.goto();
    await browsePage.openListing(tag);
    await browsePage.claim();
  });

  test('donor can report the no-show from the request detail', async ({
    donorPage,
  }) => {
    const requestsPage = new RequestsPage(donorPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    await new PickupVerificationPage(donorPage).reportNoShow();

    await expect(
      donorPage
        .getByLabel(/Notifications/i)
        .getByText('No-show reported successfully.'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('donor sees the no-show outcome on the request detail', async ({
    donorPage,
  }) => {
    const requestsPage = new RequestsPage(donorPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    await expect(
      donorPage.getByText('Pickup Outcome: No-Show'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('rescue partner sees the claim settled as no-show', async ({
    partnerPage,
  }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();
    await expect(requestsPage.rowFor(tag).getByText('No show')).toBeVisible({
      timeout: 10_000,
    });
  });
});
