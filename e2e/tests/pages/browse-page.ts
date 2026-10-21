import { type Page, type Locator, expect } from '@playwright/test';

export class BrowsePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/browse');
    // Same controlled-input hydration race as the login/create forms -
    // wait for the page to settle before reading rendered content.
    await this.page.waitForLoadState('networkidle');
  }

  /** Card for the tagged QA listing. The page renders on the server, so
   * once goto() has settled an absent card means the listing isn't
   * offered, not that it hasn't loaded yet. */
  cardFor(tag: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: tag });
  }

  async openListing(tag: string) {
    const card = this.cardFor(tag);
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
