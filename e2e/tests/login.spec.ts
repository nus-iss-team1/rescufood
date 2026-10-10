import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/sessions';
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

  // Signing in is covered by auth.setup.ts on every run; this is the only
  // place signing out is. Starting from the saved session is safe: signing
  // out only clears this context's cookie (nothing is revoked in Cognito),
  // and every other test loads its own copy of the saved session.
  test('signing out ends the session', async ({ donorPage }) => {
    await donorPage.goto('/dashboard');
    await new LoginPage(donorPage).logout();

    // Proves the session is really gone, not just that the page moved: a
    // protected page now sends the visitor to sign in. (A session cookie
    // left behind would route to /session-expired instead.)
    await donorPage.goto('/dashboard');
    await expect(donorPage).toHaveURL(/\/login$/);
  });
});
