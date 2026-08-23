import { test, expect, type Page } from '@playwright/test';
import { requireEnv } from './helpers/env';

test.describe.serial('Donor journey', () => {
  let page: Page;

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

  test('donor can post surplus food', async () => {
    await page.goto('/listings/new');
    // The form's controlled inputs can lose an early fill() to React
    // hydration finishing after the value is set - wait for the page to
    // fully settle before touching the first field.
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Quantity').fill('7');
    await page.getByLabel('Unit').fill('crates');
    await page
      .getByLabel('Description')
      .fill('test_product - automated QA listing, safe to delete');
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

  test('donor can log out', async () => {
    // Opens a confirmation dialog first; the real submit button lives inside it.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Sign out' })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });
});
