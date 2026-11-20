import { test } from '../../src/fixtures/test.js';
import { juiceShopProducts } from '../data/products.js';

test.describe('Product details @ui @regression', () => {
  test('opens product information and returns to the catalog when closed', async ({ storePage, productDetailsPage, page }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.openProductDetails(product.name);
    await productDetailsPage.expectProductDetails(product.name, product.priceText);
    await productDetailsPage.close();

    await page.locator('.products-grid app-product').filter({ hasText: product.name }).first().waitFor({ state: 'visible' });
  });
});
