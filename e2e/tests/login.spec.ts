import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { LoginPage } from './pages/login-page';

test.describe('Login', () => {
  test('blocks sign-in with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // A fresh, never-before-seen username each run so this negative test
    // never accumulates failed attempts against one account and trips the
    // app's own account-lockout feature (which would then report account
    // lockout instead of the generic sign-in failure this test checks for).
    await loginPage.fillAndSubmit(`qa-invalid-${randomUUID()}`, 'wrong_password123');

    await expect(page).toHaveURL(/\/login$/);

    const errorAlert = page.getByRole('alert').filter({ hasText: 'Sign-in failed' });
    await expect(errorAlert).toBeVisible();
  });
});
