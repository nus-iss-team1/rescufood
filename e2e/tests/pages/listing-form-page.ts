import { type Page, expect } from '@playwright/test';

export interface ListingFields {
  quantity: string;
  unit: string;
  description: string;
  allergens: string;
  pickupLocation: string;
}

export class ListingFormPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/listings/new');
    // Same hydration race as the login form - wait for the page to fully
    // settle before touching the first field.
    await this.page.waitForLoadState('networkidle');
  }

  async publish(fields: ListingFields) {
    await this.fill(fields);
    await this.page.getByRole('button', { name: 'Publish listing' }).click();

    await expect(
      this.page.getByText(
        'Your listing is live. Rescue partners can request it until the pickup window closes.',
      ),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      this.page.getByRole('link', { name: 'Post another' }),
    ).toBeVisible();
  }

  async saveDraft(fields: ListingFields) {
    await this.fill(fields);
    await this.page.getByRole('button', { name: 'Save as draft' }).click();

    await expect(
      this.page.getByText(
        'Your listing has been saved as a draft. You can edit or publish it anytime from your listings.',
      ),
    ).toBeVisible({ timeout: 10_000 });
  }

  private async fill(fields: ListingFields) {
    await this.page.getByLabel('Quantity').fill(fields.quantity);
    await this.page.getByLabel('Unit').fill(fields.unit);
    await this.page.getByLabel('Description').fill(fields.description);
    await this.page.getByLabel('Allergens').fill(fields.allergens);
    await this.page.getByLabel('Pickup location').fill(fields.pickupLocation);
  }
}
