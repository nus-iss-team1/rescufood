import { type Page, expect } from '@playwright/test';

/** Wraps the "generate code" (rescue partner) and "enter code" (donor)
 * dialogs on a request's detail page (/requests/[id]). */
export class PickupVerificationPage {
  constructor(private readonly page: Page) {}

  /** Rescue partner side: mints a code and returns the 6-digit string. */
  async generateCode(): Promise<string> {
    await this.page
      .getByRole('button', { name: 'Generate pickup code' })
      .click();

    // The code renders async after a credential fetch; it's the only
    // plain 6-digit text in the dialog.
    const codeText = this.page.getByRole('dialog').getByText(/^\d{6}$/);
    await expect(codeText).toBeVisible({ timeout: 10_000 });
    const code = (await codeText.textContent())?.trim();
    if (!code) {
      throw new Error('Pickup code dialog did not render a code.');
    }

    await this.page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    return code;
  }

  /** Donor side: opens the "enter code" dialog. Separate from submitCode so
   * a caller can submit more than one code (e.g. a wrong attempt followed
   * by the correct one) without the dialog re-opening between tries - it
   * stays open after a rejected code. */
  async openCodeDialog() {
    await this.page.getByRole('button', { name: 'Enter pickup code' }).click();
  }

  async submitCode(code: string) {
    const dialog = this.page.getByRole('dialog');
    // Filling the first digit box distributes the whole code across all
    // six boxes - see OtpInput's paste-handling. This also works to
    // overwrite a previous (wrong) attempt still sitting in the boxes.
    await this.page.getByLabel('Digit 1 of 6').fill(code);
    await dialog.getByRole('button', { name: 'Review handover' }).click();
    await dialog.getByRole('button', { name: 'Confirm handover' }).click();
  }

  /** Donor side: returns from the confirmation step, where a rejected code leaves the dialog. */
  async backToCodeEntry() {
    await this.page.getByRole('dialog').getByRole('button', { name: 'Back' }).click();
  }

  /** Donor side: reports the rescue partner as a no-show. Only enabled once
   * the pickup window has opened - publish with
   * ListingFormPage.publishWithOpenPickupWindow so this button is live. */
  async reportNoShow() {
    // The trigger sits beside "Enter pickup code"; a click lost to hydration
    // is safe to retry, it only opens the dialog.
    const reportButton = this.page.getByRole('button', { name: 'Report No-Show' });
    const dialog = this.page.getByRole('dialog');
    await expect(async () => {
      await reportButton.click();
      await expect(dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });

    // A preset fills the required reason and enables "Review outcome".
    await dialog.getByRole('button', { name: 'Partner did not arrive' }).click();
    await dialog.getByRole('button', { name: 'Review outcome' }).click();
    await dialog.getByRole('button', { name: 'Confirm No-Show' }).click();
  }
}
