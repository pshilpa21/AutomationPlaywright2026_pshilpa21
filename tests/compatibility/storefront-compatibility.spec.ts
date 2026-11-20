import { expect, test } from '../../src/fixtures/test.js';
import { allure } from 'allure-playwright';
import { juiceShopProducts } from '../data/products.js';

test.describe('Storefront compatibility @compat @regression', () => {
  test.beforeEach(async ({}, testInfo) => {
    const browser = String(testInfo.project.use.browserName ?? 'unknown browser');
    const viewport = testInfo.project.use.viewport as { width: number; height: number } | undefined;
    const viewportLabel = viewport ? `${viewport.width}x${viewport.height}` : 'default viewport';
    await allure.displayName(`${testInfo.title} [${browser} | ${viewportLabel}]`);
    testInfo.annotations.push({
      type: 'Execution environment',
      description: `${browser} | ${viewportLabel}`,
    });
  });

  test('catalog and primary product content render within the viewport', async ({ storePage, page }) => {
    await storePage.open();
    await storePage.expectStoreLoaded();

    const firstProduct = page.locator('.products-grid app-product').first();
    await expect(firstProduct).toBeVisible();
    const bounds = await firstProduct.boundingBox();
    const viewportWidth = page.viewportSize()?.width;
    expect(bounds, 'The first product card should have a rendered bounding box').not.toBeNull();
    expect(viewportWidth, 'A viewport must be configured for each compatibility project').not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewportWidth!);
  });

  test('product search works in the configured browser and viewport', async ({ storePage }) => {
    await storePage.open();
    await storePage.searchFor('Apple');
    await storePage.expectSearchResultsFor('Apple', juiceShopProducts.appleJuice.name);
  });

  test('shopper can add a product and see it in the basket', async ({ storePage, basketPage }) => {
    await storePage.open();
    await storePage.addProductToBasket(juiceShopProducts.appleJuice.name);
    await storePage.openBasket();
    await basketPage.expectProductQuantity(juiceShopProducts.appleJuice.name, 1);
  });
});
