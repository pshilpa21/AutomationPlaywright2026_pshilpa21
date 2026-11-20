import { test } from '../../src/fixtures/test.js';
import { juiceShopProducts } from '../data/products.js';

test.describe('Shopping basket @ui @regression', () => {
  test('adds a product to the basket with an initial quantity of one', async ({ storePage, basketPage }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();

    await basketPage.expectProductQuantity(product.name, 1);
  });

  test('updates the product quantity when shopper increases and decreases it', async ({ storePage, basketPage }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();

    await basketPage.increaseQuantity(product.name);
    await basketPage.expectProductQuantity(product.name, 2);

    await basketPage.decreaseQuantity(product.name);
    await basketPage.expectProductQuantity(product.name, 1);
  });

  test('removes the product and disables checkout when the basket is empty', async ({ storePage, basketPage }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();
    await basketPage.removeProduct(product.name);

    await basketPage.expectEmptyAndCheckoutDisabled();
  });

  test('keeps separate basket lines for two different products', async ({ storePage, basketPage }) => {
    const apple = juiceShopProducts.appleJuice;
    const banana = juiceShopProducts.bananaJuice;

    await storePage.open();
    await storePage.addProductToBasket(apple.name);
    await storePage.addProductToBasket(banana.name);
    await storePage.openBasket();

    await basketPage.expectProductQuantity(apple.name, 1);
    await basketPage.expectProductQuantity(banana.name, 1);

    await basketPage.removeProduct(apple.name);
    await basketPage.expectProductAbsent(apple.name);
    await basketPage.expectProductQuantity(banana.name, 1);
  });

  test('recalculates the basket total when quantity changes', async ({ storePage, basketPage }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();
    await basketPage.increaseQuantity(product.name);

    await basketPage.expectBasketTotal('3.98¤');
  });

  test('retains a guest basket after a page reload', async ({ storePage, basketPage, page }) => {
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();
    await page.reload();

    await basketPage.expectProductQuantity(product.name, 1);
  });
});
