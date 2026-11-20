import { expect, test } from '../../src/fixtures/test.js';
import { invalidLoginCredentials } from '../data/authentication.js';
import { juiceShopProducts } from '../data/products.js';

test.describe('Guest checkout @ui @regression', () => {
  test('requires sign-in and preserves the basket return destination', async ({ storePage, basketPage, page }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();
    await basketPage.startCheckout();

    await expect(page).toHaveURL(/#\/login\?redirectUrl=%2Fbasket/);
    await expect(page.locator('#login-form')).toBeVisible();
  });

  test('rejects invalid credentials after checkout requires sign-in', async ({ storePage, basketPage, page }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();
    await basketPage.startCheckout();

    await page.locator('#email').fill(invalidLoginCredentials.email);
    await page.locator('#password').fill(invalidLoginCredentials.password);
    await page.locator('#loginButton').click();

    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
