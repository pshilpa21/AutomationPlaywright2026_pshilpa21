import { expect, type Page } from '@playwright/test';

export class StorePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.dismissFirstVisitDialogs();
  }

  private async dismissFirstVisitDialogs(): Promise<void> {
    const welcomeHeading = this.page.getByRole('heading', { name: 'Welcome to OWASP Juice Shop!' });
    const welcomeDismissButton = this.page.getByRole('button', { name: 'Close Welcome Banner' });
    // A fresh Playwright context shows this modal asynchronously; wait for it instead of checking too early.
    await welcomeDismissButton.waitFor({ state: 'visible' });
    await welcomeDismissButton.click();
    await expect(welcomeHeading).toBeHidden();
    // Wait for the modal backdrop to finish closing before clicking the cookie banner underneath it.
    await expect(this.page.locator('.cdk-overlay-backdrop')).toHaveCount(0);

    const cookieDismissButton = this.page.getByRole('button', { name: 'dismiss cookie message' });
    if (await cookieDismissButton.isVisible()) {
      await cookieDismissButton.click();
    }
  }

  async expectStoreLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Juice Shop/i);
    await expect(this.page.locator('mat-card').first()).toBeVisible();
  }

  async searchFor(productName: string): Promise<void> {
    const searchInput = this.page.locator('#searchQuery input');
    await searchInput.fill(productName);
    await searchInput.press('Enter');
  }

  async addProductToBasket(productName: string): Promise<void> {
    const productCard = this.page.locator('.products-grid app-product').filter({ hasText: productName }).first();
    await expect(productCard).toBeVisible();
    await productCard.getByRole('button', { name: /add to basket/i }).click();
  }

  async openProductDetails(productName: string): Promise<void> {
    const productCard = this.page.locator('.products-grid app-product').filter({ hasText: productName }).first();
    await expect(productCard).toBeVisible();
    await productCard.getByRole('button', { name: 'Click for more information about the product' }).click();
  }

  async openBasket(): Promise<void> {
    await this.page.getByRole('button', { name: 'Show the shopping cart' }).click();
  }

  async expectSearchResultsFor(searchTerm: string, expectedProductName: string): Promise<void> {
    await expect(this.page.locator('#searchValue')).toHaveText(searchTerm.trim());
    const matchingProduct = this.page.locator('.products-grid app-product').filter({ hasText: expectedProductName }).first();
    await expect(matchingProduct).toBeVisible();
  }

  async expectNoSearchResultsFor(searchTerm: string): Promise<void> {
    await expect(this.page.locator('#searchValue')).toHaveText(searchTerm);
    await expect(this.page.locator('.emptyState')).toBeVisible();
    await expect(this.page.locator('.products-grid app-product')).toHaveCount(0);
  }

  async expectCatalogResults(): Promise<void> {
    await expect(this.page.locator('#searchValue')).toHaveCount(0);
    await expect(this.page.locator('.products-grid app-product').first()).toBeVisible();
  }
}
