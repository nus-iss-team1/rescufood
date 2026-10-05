import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { DONOR_AUTH, PARTNER_AUTH } from './helpers/auth';

// Signs each role in once per run and saves the session, so specs start
// already signed in instead of logging in and out between steps. Sessions
// are cookie-only (NextAuth JWT) and sign-out doesn't revoke anything in
// Cognito, so login.spec signing out its own fresh session can't
// invalidate these.

setup('sign in as donor', async ({ page }) => {
  await new LoginPage(page).loginAsDonor();
  await page.context().storageState({ path: DONOR_AUTH });
});

setup('sign in as rescue partner', async ({ page }) => {
  await new LoginPage(page).loginAsRescuePartner();
  await page.context().storageState({ path: PARTNER_AUTH });
});
