import { test, expect } from './fixtures/sessions';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { PickupVerificationPage } from './pages/pickup-verification-page';
import { buildQaListing } from './fixtures/listing-data';

// Cross-service pickup completion: a claimed listing goes active -> code ->
// completed, and the completed outcome is asserted from BOTH roles' request
// detail views (the donor who confirmed and the rescue partner who claimed).
test.describe.serial('Pickup completion, verified from both roles', () => {
  // Unique per run, distinct from the other specs.
  const tag = `qa-pickup-done-${Date.now()}`;
  let code: string;

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

  test('rescue partner can generate a pickup code', async ({ partnerPage }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    code = await new PickupVerificationPage(partnerPage).generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  test('donor can confirm pickup with the code', async ({ donorPage }) => {
    const requestsPage = new RequestsPage(donorPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    const pickupPage = new PickupVerificationPage(donorPage);
    await pickupPage.openCodeDialog();
    await pickupPage.submitCode(code);

    await expect(
      donorPage.getByLabel(/Notifications/i).getByText('Pickup completed'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('donor sees the request completed on its detail page', async ({
    donorPage,
  }) => {
    const requestsPage = new RequestsPage(donorPage);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    await expect(
      donorPage.getByText('Pickup completed', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('rescue partner sees the request completed on its detail page', async ({
    partnerPage,
  }) => {
    const requestsPage = new RequestsPage(partnerPage);
    await requestsPage.goto();
    // The partner's /requests still rows the settled claim; its badge reads
    // Completed and its detail page shows the same outcome as the donor's.
    await expect(requestsPage.rowFor(tag).getByText('Completed')).toBeVisible();
    await requestsPage.openRequestFor(tag);

    await expect(
      partnerPage.getByText('Pickup completed', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
