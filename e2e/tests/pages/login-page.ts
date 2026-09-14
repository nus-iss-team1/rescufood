import { type Page, expect } from '@playwright/test';
import { requireEnv } from '../helpers/env';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
    // The login form's controlled inputs can lose an early fill() to React
    // hydration finishing after the value is set - wait for the page to
    // fully settle before touching the first field.
    await this.page.waitForLoadState('networkidle');
  }

  /** Fills and submits the form without asserting the outcome, so callers
   * testing a rejected sign-in (wrong credentials) can reuse this too. */
  async fillAndSubmit(username: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Username' }).fill(username);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  async login(username: string, password: string) {
    await this.fillAndSubmit(username, password);
    await expect(this.page).toHaveURL(/\/dashboard$/);
  }

  async loginAsDonor() {
    await this.goto();
    await this.login(
      requireEnv('TEST_DONOR_USERNAME'),
      requireEnv('TEST_DONOR_PASSWORD'),
    );
    await expect(this.page.getByText('Post surplus food')).toBeVisible();
  }

  async loginAsRescuePartner() {
    await this.goto();
    await this.login(
      requireEnv('TEST_RESCUE_PARTNER_USERNAME'),
      requireEnv('TEST_RESCUE_PARTNER_PASSWORD'),
    );
    await expect(this.page.getByText('Find & claim surplus food')).toBeVisible();
  }

  async logout() {
    // Opens a confirmation dialog first; the real submit button lives
    // inside it.
    await this.page.getByRole('button', { name: 'Sign out' }).click();
    await this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Sign out' })
      .click();

    await expect(this.page).toHaveURL(/\/$/);
    // exact: true - the landing page's marketing copy also has a lowercase
    // "sign in" link, and name matching is case-insensitive by default, so
    // an unqualified match here is ambiguous (a latent flake in the
    // original spec this was extracted from: harmless while unhydrated
    // marketing content hadn't rendered yet, but real once it has).
    await expect(
      this.page.getByRole('link', { name: 'Sign in', exact: true }),
    ).toBeVisible();
  }
}
