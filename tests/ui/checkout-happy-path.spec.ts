import { test } from '../../src/fixtures/test.js';
import { createCheckoutTestData } from '../data/checkout.js';
import { juiceShopProducts } from '../data/products.js';

test.describe('Signed-in checkout @ui @regression', () => {
  test('registers a shopper and completes a purchase with synthetic data', async ({
    storePage,
    accountPage,
    basketPage,
    checkoutPage,
    page,
  }) => {
    const data = createCheckoutTestData();
    const product = juiceShopProducts.appleJuice;

    await storePage.open();
    await accountPage.openLoginFromHeader();
    await accountPage.openRegistration();
    await accountPage.register(data.account);
    await accountPage.login(data.account);

    await page.getByRole('button', { name: 'Back to homepage' }).click();
    await storePage.expectStoreLoaded();
    await storePage.addProductToBasket(product.name);
    await storePage.openBasket();
    await basketPage.startCheckout();

    await checkoutPage.expectAddressStepAndContinueDisabled();
    await checkoutPage.addAddress(data.address);
    await checkoutPage.selectAddressAndContinue(data.address.name);
    await checkoutPage.selectFirstDeliveryMethodAndContinue();
    await checkoutPage.addCardAndContinue(data.card);
    await checkoutPage.placeOrderAndExpectConfirmation(product.name, data.address.name);
  });
});
