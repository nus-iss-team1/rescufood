import { type Page, expect } from '@playwright/test';

export class BrowsePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/browse');
    // Same controlled-input hydration race as the login/create forms -
    // wait for the page to settle before reading rendered content.
    await this.page.waitForLoadState('networkidle');
  }

  async openListing(tag: string) {
    const card = this.page.getByRole('listitem').filter({ hasText: tag });
    await expect(card).toBeVisible();

    // The click occasionally lands before the page finishes hydrating and
    // doesn't navigate. Retrying the click is safe: it's just a link, not
    // a mutation.
    await expect(async () => {
      await card.getByRole('link', { name: 'View Details' }).click();
      await this.page.waitForURL(/\/browse\/[^/]+$/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await this.page.waitForLoadState('networkidle');
  }

  async claim() {
    // Same hydration race as openListing. Retrying is still safe here: the
    // form mints one idempotency key on mount and reuses it for every
    // submit, so a repeat click can't file a second claim.
    await expect(async () => {
      const claimButton = this.page.getByRole('button', {
        name: 'Claim Lot',
        exact: true,
      });
      if (await claimButton.isVisible()) {
        await claimButton.click();
      }
      await expect(this.page.getByText('Lot Claimed Successfully!')).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 20_000 });
  }
}
