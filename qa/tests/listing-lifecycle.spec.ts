import { test, expect, type Page } from '@playwright/test';
import { requireEnv } from './helpers/env';

test.describe.serial('Listing claim lifecycle', () => {
  let page: Page;
  // Unique per run so the rescue partner steps can find this exact listing
  // among whatever else is already on /browse.
  const tag = `qa-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('donor can log in', async () => {
    await page.goto('/login');
    // Same hydration race as the create-listing form - wait for the page
    // to settle before touching a field.
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('textbox', { name: 'Username' })
      .fill(requireEnv('TEST_DONOR_USERNAME'));
    await page
      .getByRole('textbox', { name: 'Password' })
      .fill(requireEnv('TEST_DONOR_PASSWORD'));
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Post surplus food')).toBeVisible();
  });

  test('donor can post a tagged QA listing', async () => {
    await page.goto('/listings/new');
    // The form's controlled inputs can lose an early fill() to React
    // hydration finishing after the value is set - wait for the page to
    // fully settle before touching the first field.
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Quantity').fill('7');
    await page.getByLabel('Unit').fill('crates');
    // Unique per run so the rescue partner steps can find this exact
    // listing among whatever else is on /browse.
    await page
      .getByLabel('Description')
      .fill(`test_product - automated QA listing ${tag}, safe to delete`);
    await page.getByLabel('Allergens').fill('none');
    await page.getByLabel('Pickup location').fill('1 QA Test Street, Test City');

    await page.getByRole('button', { name: 'Publish listing' }).click();

    await expect(
      page.getByText(
        'Your listing is live. Rescue partners can request it until the pickup window closes.',
      ),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('link', { name: 'Post another' }),
    ).toBeVisible();
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
    // Opens a confirmation dialog first; the real submit button lives
    // inside it. Signing out here lets the next test log in as the rescue
    // partner in the same browser session.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Sign out' })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('rescue partner can log in', async () => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('textbox', { name: 'Username' })
      .fill(requireEnv('TEST_RESCUE_PARTNER_USERNAME'));
    await page
      .getByRole('textbox', { name: 'Password' })
      .fill(requireEnv('TEST_RESCUE_PARTNER_PASSWORD'));
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Find & claim surplus food')).toBeVisible();
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
    const card = page.getByRole('listitem').filter({ hasText: tag });
    await expect(card).toBeVisible();

    // The click occasionally lands before the page finishes hydrating and
    // doesn't navigate - same class of race the donor form comments call
    // out elsewhere in this suite. Retrying the click is safe: it's just a
    // link, not a mutation.
    await expect(async () => {
      await card.getByRole('link', { name: 'View Details' }).click();
      await page.waitForURL(/\/browse\/[^/]+$/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await page.waitForLoadState('networkidle');

    // The detail page renders the listing description as a heading twice
    // (page title + detail card title) - either instance proves the right
    // listing loaded.
    await expect(
      page.getByRole('heading', { name: new RegExp(tag) }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('rescue partner can claim the tagged QA listing', async () => {
    // Same hydration race as the "view" step above. Retrying is still safe
    // here: the form mints one idempotency key on mount and reuses it for
    // every submit, so a repeat click can't file a second claim.
    await expect(async () => {
      const claimButton = page.getByRole('button', {
        name: 'Claim Lot',
        exact: true,
      });
      if (await claimButton.isVisible()) {
        await claimButton.click();
      }
      await expect(page.getByText('Lot Claimed Successfully!')).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 20_000 });
  });

  test('rescue partner can cancel the claimed request', async () => {
    await page.goto('/requests');
    await page.waitForLoadState('networkidle');

    // getByRole('listitem') also matches the breadcrumb's <li> elements, so
    // filter down to actual request rows before taking the first one - the
    // claim just filed sorts first since requests default to newest first.
    const request = page
      .getByRole('listitem')
      .filter({ hasText: 'requested' })
      .first();
    await expect(request.getByText('Pending')).toBeVisible();

    await request.getByRole('button', { name: 'Cancel' }).click();

    await expect(request.getByText('Cancelled')).toBeVisible({ timeout: 10_000 });
  });

  test('rescue partner can log out', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Sign out' })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  // TODO: once the donor UI exposes a "Delete listing" action (the
  // deleteListing API client already exists in
  // web/platform/src/lib/listings.ts, it's just not wired to any button
  // yet), add a final step here where the donor logs back in and deletes
  // this tagged listing to fully clean up after the run.
});
