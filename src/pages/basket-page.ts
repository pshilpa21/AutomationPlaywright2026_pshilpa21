import { expect, type Locator, type Page } from '@playwright/test';

export class BasketPage {
  constructor(private readonly page: Page) {}

  private productRow(productName: string): Locator {
    return this.page.locator('mat-row').filter({ hasText: productName });
  }

  async expectProductQuantity(productName: string, quantity: number): Promise<void> {
    const row = this.productRow(productName);
    await expect(row).toBeVisible();
    await expect(row.locator('.mat-column-quantity .cell-initial-font')).toHaveText(String(quantity));
  }

  async increaseQuantity(productName: string): Promise<void> {
    const quantityButtons = this.productRow(productName).locator('.mat-column-quantity button');
    await expect(quantityButtons).toHaveCount(2);
    // Juice Shop exposes these icon-only buttons without accessible names: minus first, plus second.
    await quantityButtons.nth(1).click();
  }

  async decreaseQuantity(productName: string): Promise<void> {
    const quantityButtons = this.productRow(productName).locator('.mat-column-quantity button');
    await expect(quantityButtons).toHaveCount(2);
    await quantityButtons.nth(0).click();
  }

  async removeProduct(productName: string): Promise<void> {
    await this.productRow(productName).locator('.mat-column-remove button').click();
  }

  async startCheckout(): Promise<void> {
    await this.page.locator('#checkoutButton').click();
  }

  async expectEmptyAndCheckoutDisabled(): Promise<void> {
    await expect(this.page.locator('mat-row')).toHaveCount(0);
    await expect(this.page.locator('#checkoutButton')).toBeDisabled();
  }

  async expectBasketTotal(totalText: string): Promise<void> {
    await expect(this.page.locator('#price')).toContainText(totalText);
  }

  async expectProductAbsent(productName: string): Promise<void> {
    await expect(this.productRow(productName)).toHaveCount(0);
  }
}
