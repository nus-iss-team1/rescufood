import { type Page, type Locator, expect } from '@playwright/test';

export class RequestsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/requests');
    await this.page.waitForLoadState('networkidle');
  }

  /** Row for the request against the tagged QA listing. */
  rowFor(tag: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: tag });
  }

  /** Opens the detail page for the request against the tagged QA listing. */
  async openRequestFor(tag: string) {
    await this.open(this.rowFor(tag));
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
