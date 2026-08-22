import { test, expect, type Page } from '@playwright/test';
import { requireEnv } from './helpers/env';

test.describe.serial('Rescue partner journey', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('rescue partner can log in', async () => {
    await page.goto('/login');
    // Same hydration race as the create-listing form - wait for the page
    // to settle before touching a field.
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
    // At least one available listing renders with its own request action -
    // proof the browse page actually loaded real data, not just the shell.
    await expect(page.getByRole('button', { name: 'Request' }).first()).toBeVisible();
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
});
