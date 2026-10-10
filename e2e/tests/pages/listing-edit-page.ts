import { type Page, expect } from '@playwright/test';

/** The donor's edit form for one listing (/listings/[id]). */
export class ListingEditPage {
  constructor(private readonly page: Page) {}

  /** Picks a status by its label in the form, e.g. "Available (published)". */
  async setStatus(label: string) {
    const option = this.page.getByRole('option', { name: label });
    // Opening the dropdown is harmless, so a click lost to hydration can
    // just be retried.
    await expect(async () => {
      await this.page.getByRole('combobox', { name: 'Status' }).click();
      await expect(option).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await option.click();
  }

  /** The reason field the form reveals once Cancelled is selected. */
  async fillCancellationReason(text: string) {
    await this.page.getByLabel('Reason for cancelling').fill(text);
  }

  async fillHandlingInfo(text: string) {
    await this.page.getByLabel('Handling info').fill(text);
  }

  /** A reserved, collected, expired or cancelled listing opens read-only. */
  async expectLocked() {
    await expect(
      this.page.getByText('This listing can no longer be edited.'),
    ).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: 'Save changes' }),
    ).toBeDisabled();
  }

  async save() {
    await this.page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      this.page.getByText('Listing updated successfully!'),
    ).toBeVisible({ timeout: 10_000 });
  }
}
