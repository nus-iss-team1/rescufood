import { type Page, type Locator, expect } from '@playwright/test';

export class RequestsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/requests');
    await this.page.waitForLoadState('networkidle');
  }

  /** Opens the detail page for the request against the tagged QA listing.
   * Donor-side only: GET /listings only returns someone else's listings
   * while "available", so a rescue partner's active claim never resolves a
   * description here (falls back to quantity text) - only the owning
   * donor's own listings stay visible in every status. Rescue-partner
   * lookups should use mostRecentActiveRequest() instead. */
  async openRequestFor(tag: string) {
    const row = this.page.getByRole('listitem').filter({ hasText: tag });
    await this.open(row);
  }

  /** Rescue-partner side: the request just filed always sorts first
   * (requests default to newest first), so this is reliable even though
   * the row itself can't be matched by tag/description. */
  mostRecentActiveRequest(): Locator {
    return this.page.getByRole('listitem').filter({ hasText: 'requested' }).first();
  }

  async open(row: Locator) {
    await expect(row).toBeVisible();

    // Same hydration race as the browse page link - retrying the click is
    // safe, it's just a link.
    await expect(async () => {
      await row.getByRole('link', { name: 'View Details' }).click();
      await this.page.waitForURL(/\/requests\/[^/]+$/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await this.page.waitForLoadState('networkidle');
  }
}
