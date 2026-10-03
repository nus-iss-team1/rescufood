import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
import { PickupVerificationPage } from './pages/pickup-verification-page';
import { buildQaListing } from './fixtures/listing-data';

test.describe.serial('Listing claim lifecycle', () => {
  let page: Page;
  let loginPage: LoginPage;
  // Unique per run so the rescue partner steps can find this exact listing
  // among whatever else is already on /browse.
  const tag = `qa-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    loginPage = new LoginPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('donor can log in', async () => {
    await loginPage.loginAsDonor();
  });

  test('donor can post a tagged QA listing', async () => {
    const listingFormPage = new ListingFormPage(page);
    await listingFormPage.goto();
    await listingFormPage.publish(buildQaListing(tag));
  });

  test('donor can edit the tagged QA listing', async () => {
    await page.goto('/listings');
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('listitem').filter({ hasText: tag });
    await expect(row).toBeVisible();

    // Same hydration race as the browse page link above - retrying the
    // click is safe, it's just a link.
    await expect(async () => {
      await row.getByRole('link', { name: 'View / Edit' }).click();
      await page.waitForURL(/\/listings\/[^/]+$/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await page.waitForLoadState('networkidle');

    await page
      .getByLabel('Handling info')
      .fill(`Updated by automated QA edit ${tag}`);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Listing updated successfully!')).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test('donor can log out', async () => {
    // Signing out here lets the next test log in as the rescue partner in
    // the same browser session.
    await loginPage.logout();
  });

  test('rescue partner can log in', async () => {
    await loginPage.loginAsRescuePartner();
  });

  test('rescue partner can view listings', async () => {
    await page.goto('/browse');
    // Same controlled-input hydration race as the donor form - safer to
    // wait for the page to settle before reading rendered content.
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Find surplus food' }),
    ).toBeVisible();
    // At least one available listing renders with its own details link -
    // proof the browse page actually loaded real data, not just the shell.
    await expect(
      page.getByRole('link', { name: 'View Details' }).first(),
    ).toBeVisible();
  });

  test('rescue partner can view the tagged QA listing', async () => {
    // Still on /browse from the previous test.
    const browsePage = new BrowsePage(page);
    await browsePage.openListing(tag);

    // The detail page renders the listing description as a heading twice
    // (page title + detail card title) - either instance proves the right
    // listing loaded.
    await expect(
      page.getByRole('heading', { name: new RegExp(tag) }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('rescue partner can claim the tagged QA listing', async () => {
    await new BrowsePage(page).claim();
  });

  test('rescue partner can cancel the claimed request', async () => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    // getByRole('listitem') also matches the breadcrumb's <li> elements, so
    // mostRecentActiveRequest() filters down to actual request rows before
    // taking the first one.
    const request = requestsPage.mostRecentActiveRequest();
    await expect(request.getByText('Active')).toBeVisible();

    // Opens a confirmation dialog first; the real submit lives inside it.
    await request.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Cancel claim' })
      .click();

    await expect(request.getByText('Cancelled')).toBeVisible({ timeout: 10_000 });
  });

  test('rescue partner can log out', async () => {
    await loginPage.logout();
  });

  // TODO: once the donor UI exposes a "Delete listing" action (the
  // deleteListing API client already exists in
  // web/platform/src/lib/listings.ts, it's just not wired to any button
  // yet), add a final step here where the donor logs back in and deletes
  // this tagged listing to fully clean up after the run.
});

// A separate describe (own browser page, own login) rather than a second
// `test.describe.serial` nested under the one above. A claim can only end
// one way - cancelled or completed - so this needs its own listing, and
// with `fullyParallel: true` two independent serial groups in one file can
// be scheduled onto different workers; sharing a single `page` between them
// would then race. A fresh page per group costs an extra login but stays
// correct regardless of worker count.
test.describe.serial('Listing pickup-code confirmation', () => {
  let page: Page;
  let loginPage: LoginPage;
  // Unique per run, distinct from the cancellation spec above.
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

    // Can't match by tag here: a rescue partner's own active claim doesn't
    // resolve a listing description on this page (GET /listings only
    // returns someone else's listing while it's "available") - see
    // RequestsPage.openRequestFor for the full explanation.
    // TODO: once that's fixed, switch back to
    // `await requestsPage.openRequestFor(tag)` here (matches the donor-side
    // lookup below) and drop mostRecentActiveRequest() along with the
    // `workers: 1` pin in playwright.config.ts.
    const request = requestsPage.mostRecentActiveRequest();
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
    // a successful verify revalidates the request, which flips its status
    // away from "active" and unmounts the whole dialog component (see the
    // comment on PickupVerification's `verify` callback) - the inline
    // "Verification successful." text can vanish before this observes it.
    // The toast lives in a separate region, so it isn't racing its own
    // trigger's unmount. It also avoids a strict-mode ambiguity: the wrong-
    // code text appears in both the toast and the (still-open, since that
    // attempt fails) dialog paragraph - scoping to the toast picks one.
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

    await pickupPage.submitCode(code);
    await expect(notifications.getByText('Pickup confirmed')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('donor can log out', async () => {
    await loginPage.logout();
  });
});
