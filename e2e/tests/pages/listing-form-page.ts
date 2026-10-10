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
    await this.submit(
      'Publish listing',
      'Your listing is live. Rescue partners can request it until the pickup window closes.',
    );
    await expect(
      this.page.getByRole('link', { name: 'Post another' }),
    ).toBeVisible();
  }

  async saveDraft(fields: ListingFields) {
    await this.fill(fields);
    await this.submit(
      'Save as draft',
      'Your listing has been saved as a draft. You can edit or publish it anytime from your listings.',
    );
  }

  private async submit(buttonName: string, successText: string) {
    const button = this.page.getByRole('button', { name: buttonName });
    const formError = this.page.locator('form [role="alert"]');
    const success = this.page.getByText(successText);

    // Until React hydrates the form, its action is a no-op placeholder, so
    // a click that lands first is dropped without a trace - networkidle
    // only means the scripts have downloaded, not that they've run. Retry
    // until the form reacts. This can't submit twice: once a submit starts
    // the button is renamed ("Publishing..." / "Saving draft...") and then
    // replaced by the success message, so it no longer matches. A rejected
    // submit shows an error under the form instead - don't resubmit that,
    // let the assertion fail with the error in the snapshot.
    await expect(async () => {
      if ((await button.isVisible()) && !(await formError.isVisible())) {
        await button.click();
      }
      await expect(success).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  private async fill(fields: ListingFields) {
    await this.page.getByLabel('Quantity').fill(fields.quantity);
    await this.page.getByLabel('Unit').fill(fields.unit);
    await this.page.getByLabel('Description').fill(fields.description);
    await this.page.getByLabel('Allergens').fill(fields.allergens);
    await this.page.getByLabel('Pickup location').fill(fields.pickupLocation);
  }
}
