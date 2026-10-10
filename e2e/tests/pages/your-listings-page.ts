import { type Page, type Locator, expect } from '@playwright/test';

/** The donor's own listings (/listings): open one to edit, or delete it. */
export class YourListingsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/listings');
    await this.page.waitForLoadState('networkidle');
  }

  /** Row for the tagged QA listing. */
  rowFor(tag: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: tag });
  }

  async openEdit(tag: string) {
    const row = this.rowFor(tag);
    await expect(row).toBeVisible();

    // Same hydration race as the browse page link - retrying the click is
    // safe, it's just a link.
    await expect(async () => {
      // The verb follows the status: editable lots edit, locked ones view.
      await row.getByRole('link', { name: /View listing|Edit listing/ }).click();
      await this.page.waitForURL(/\/listings\/[^/]+$/, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await this.page.waitForLoadState('networkidle');
  }

  /** Confirms the delete dialog without asserting the outcome, so callers
   * can check either a successful delete or a refusal. */
  async delete(tag: string) {
    const row = this.rowFor(tag);
    await expect(row).toBeVisible();

    // The row's Delete button only opens the confirmation dialog, so
    // retrying a click lost to hydration can't delete anything.
    const dialog = this.page.getByRole('dialog');
    await expect(async () => {
      await row.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });

    await dialog.getByRole('button', { name: 'Delete listing' }).click();
  }
}
