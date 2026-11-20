import { test as base, expect } from '@playwright/test';
import { StorePage } from '../pages/store-page.js';
import { BasketPage } from '../pages/basket-page.js';
import { ProductDetailsPage } from '../pages/product-details-page.js';
import { AccountPage } from '../pages/account-page.js';
import { CheckoutPage } from '../pages/checkout-page.js';

type UiFixtures = {
  storePage: StorePage;
  basketPage: BasketPage;
  productDetailsPage: ProductDetailsPage;
  accountPage: AccountPage;
  checkoutPage: CheckoutPage;
};

export const test = base.extend<UiFixtures>({
  storePage: async ({ page }, use) => {
    await use(new StorePage(page));
  },
  basketPage: async ({ page }, use) => {
    await use(new BasketPage(page));
  },
  productDetailsPage: async ({ page }, use) => {
    await use(new ProductDetailsPage(page));
  },
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

export { expect };
