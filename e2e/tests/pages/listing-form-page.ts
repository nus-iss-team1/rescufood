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
    await this.submitPublish();
  }

  /** Publishes with the pickup window already open, so a donor can report a
   * no-show against the claim straight away. The form defaults the window to
   * start an hour out (see create-listing-form), which leaves the donor's
   * "Report No-Show" button disabled until it opens; this backdates the
   * start to earlier today before publishing. */
  async publishWithOpenPickupWindow(fields: ListingFields) {
    await this.fill(fields);
    await this.backdatePickupWindowStart();
    await this.submitPublish();
  }

  private async submitPublish() {
    await this.submit(
      'Publish listing',
      'Your listing is live. Rescue partners can request it until the pickup window closes.',
    );
    await expect(
      this.page.getByRole('link', { name: 'Post another' }),
    ).toBeVisible();
  }

  /** Lowers the pickup-window "From" time to earlier today, leaving the date
   * (today, as the form defaults it) and the "Until" time untouched so the
   * window is already open but not yet closed. The time pickers are
   * 5-minute dropdowns, so the target is kept comfortably in the past. */
  private async backdatePickupWindowStart() {
    const now = new Date();
    // ~90 minutes ago, clamped to stay on today so the (already-selected)
    // date stays correct without touching the calendar.
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    const target = Math.max(5, minutesSinceMidnight - 90);
    const hour24 = Math.floor(target / 60);
    // Snap down to the dropdown's 5-minute grid so the value can be picked
    // and stays <= the computed time (still in the past).
    const minute = Math.floor((target % 60) / 5) * 5;

    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

    // Scope to the start field's own dropdowns (ids are prefixed with the
    // field name) so the untouched "Until" selects aren't matched.
    await this.selectOption('pickupWindowStart-hour', String(hour12));
    await this.selectOption(
      'pickupWindowStart-minute',
      String(minute).padStart(2, '0'),
    );
    await this.selectOption('pickupWindowStart-period', period);
  }

  /** Picks an option in a base-ui Select identified by its trigger id. */
  private async selectOption(triggerId: string, optionName: string) {
    const trigger = this.page.locator(`#${triggerId}`);
    const option = this.page.getByRole('option', { name: optionName, exact: true });
    // Opening the dropdown is harmless, so a click lost to hydration can be
    // retried until the option list appears.
    await expect(async () => {
      await trigger.click();
      await expect(option).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
    await option.click();
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
