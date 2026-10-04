import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { PickupVerificationPage } from './pages/pickup-verification-page';
import { buildQaListing } from './fixtures/listing-data';

test.describe.serial('Listing pickup-code confirmation', () => {
  let page: Page;
  let loginPage: LoginPage;
  // Unique per run, distinct from the cancellation spec.
  const tag = `qa-pickup-${Date.now()}`;
  let code: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    loginPage = new LoginPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('donor can post a tagged QA listing', async () => {
    await loginPage.loginAsDonor();
    const listingFormPage = new ListingFormPage(page);
    await listingFormPage.goto();
    await listingFormPage.publish(buildQaListing(tag));
    await loginPage.logout();
  });

  test('rescue partner can claim the tagged QA listing', async () => {
    await loginPage.loginAsRescuePartner();
    const browsePage = new BrowsePage(page);
    await browsePage.goto();
    await browsePage.openListing(tag);
    await browsePage.claim();
  });

  test('rescue partner can generate a pickup code', async () => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const request = requestsPage.rowFor(tag);
    await expect(request.getByText('Active')).toBeVisible();
    await requestsPage.open(request);

    code = await new PickupVerificationPage(page).generateCode();
    expect(code).toMatch(/^\d{6}$/);

    await loginPage.logout();
  });

  test('donor can confirm pickup with the correct code after a wrong attempt', async () => {
    await loginPage.loginAsDonor();
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();
    await requestsPage.openRequestFor(tag);

    const pickupPage = new PickupVerificationPage(page);
    await pickupPage.openCodeDialog();

    // Asserting via the toast rather than the dialog's own inline message:
    // a successful verify closes the dialog, leaving no inline message to
    // observe. It also avoids a strict-mode ambiguity: the wrong-code text
    // appears in both the toast and the (still-open, since that attempt
    // fails) dialog paragraph - scoping to the toast picks one.
    const notifications = page.getByLabel(/Notifications/i);

    // A wrong code first, mirroring how a real donor would retry rather
    // than getting it right on the first try. Soft so a bug in rejecting
    // it can't hide whether the real code afterwards actually works - both
    // checks get their own independent pass/fail signal from this one run.
    const wrongCode = code === '000000' ? '111111' : '000000';
    await pickupPage.submitCode(wrongCode);
    await expect
      .soft(notifications.getByText('invalid pickup code'))
      .toBeVisible({ timeout: 10_000 });

    await pickupPage.backToCodeEntry();
    await pickupPage.submitCode(code);
    await expect(notifications.getByText('Pickup completed')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('donor can log out', async () => {
    await loginPage.logout();
  });
});
