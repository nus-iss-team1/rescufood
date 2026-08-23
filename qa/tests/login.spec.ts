import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('Login', () => {
  test('blocks sign-in with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    // Same hydration race as the create-listing form (GSAP entrance
    // animation on a client-hydrating form) - wait for the page to settle
    // before touching a field.
    await page.waitForLoadState('networkidle');

    // A fresh, never-before-seen username each run so this negative test
    // never accumulates failed attempts against one account and trips the
    // app's own account-lockout feature (which would then report account
    // lockout instead of the generic sign-in failure this test checks for).
    await page
      .getByRole('textbox', { name: 'Username' })
      .fill(`qa-invalid-${randomUUID()}`);
    await page.getByRole('textbox', { name: 'Password' }).fill('wrong_password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/login$/);

    const errorAlert = page.getByRole('alert').filter({ hasText: 'Sign-in failed' });
    await expect(errorAlert).toBeVisible();
  });
});
