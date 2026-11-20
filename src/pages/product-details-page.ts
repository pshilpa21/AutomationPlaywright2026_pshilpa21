import { expect, type Page } from '@playwright/test';

export class ProductDetailsPage {
  constructor(private readonly page: Page) {}

  async expectProductDetails(name: string, priceText: string): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name })).toBeVisible();
    await expect(dialog.locator('.item-price')).toHaveText(priceText);
    await expect(dialog.getByRole('button', { name: /^Reviews \(\d+\)$/ })).toBeVisible();
  }

  async close(): Promise<void> {
    await this.page.getByRole('button', { name: 'Close Dialog' }).click();
    await expect(this.page.locator('mat-dialog-container')).toBeHidden();
  }
}
