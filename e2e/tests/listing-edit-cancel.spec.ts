import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { ListingFormPage } from './pages/listing-form-page';
import { BrowsePage } from './pages/browse-page';
import { RequestsPage } from './pages/requests-page';
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

    const request = requestsPage.rowFor(tag);
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
