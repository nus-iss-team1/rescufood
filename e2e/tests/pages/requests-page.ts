import { type Page, type Locator, expect } from '@playwright/test';

export class RequestsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/requests');
    await this.page.waitForLoadState('networkidle');
  }

  /** The requests list scoped to one status tab (active, cancelled,
   * completed, no_show, expired), via the same query param the status tabs
   * use. The page renders on the server, so once it settles an absent row
   * means the filter excluded the claim, not that it hasn't loaded. */
  async gotoFiltered(status: string) {
    await this.page.goto(`/requests?status=${status}`);
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

  /** Rescue-partner side: cancels the claim against the tagged QA listing
   * from its row, picking a preset reason in the confirmation dialog. */
  async cancelClaimFor(tag: string, preset = 'Schedule conflict') {
    const row = this.rowFor(tag);
    await expect(row).toBeVisible();

    // The row's Cancel button only opens the confirmation dialog, so a
    // retried click lost to hydration can't cancel twice.
    const dialog = this.page.getByRole('dialog');
    await expect(async () => {
      await row.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });

    // A reason is required: the confirm button stays disabled until one is
    // picked.
    await dialog.getByRole('button', { name: preset }).click();
    await dialog.getByRole('button', { name: 'Cancel claim' }).click();
  }
}
