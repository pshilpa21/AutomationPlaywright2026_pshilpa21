import { expect, test } from '../../src/fixtures/test.js';

test.describe('Catalog navigation and layout @ui @regression', () => {
  test('moves to the next catalog page and returns to the first page', async ({ storePage, page }) => {
    await storePage.open();

    const firstProduct = page.locator('.products-grid app-product').first();
    await expect(firstProduct).toBeVisible();
    const firstPageFirstProduct = await firstProduct.innerText();

    const paginatorButtons = page.locator('mat-paginator button');
    await expect(paginatorButtons).toHaveCount(2);
    await paginatorButtons.last().click();
    await expect(firstProduct).not.toContainText(firstPageFirstProduct);

    await paginatorButtons.first().click();
    await expect(firstProduct).toContainText(firstPageFirstProduct);
  });

  test('shows catalog products at a narrow mobile viewport', async ({ storePage, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await storePage.open();

    await expect(page.locator('.products-grid app-product').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show the shopping cart' })).toBeVisible();
  });
});
