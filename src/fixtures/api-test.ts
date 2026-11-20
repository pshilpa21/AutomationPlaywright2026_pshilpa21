import { test as base, expect } from '@playwright/test';
import { AuthApi } from '../api/auth-api.js';
import { ProductsApi } from '../api/products-api.js';

type ApiFixtures = {
  authApi: AuthApi;
  productsApi: ProductsApi;
};

export const test = base.extend<ApiFixtures>({
  authApi: async ({ request }, use) => {
    await use(new AuthApi(request));
  },
  productsApi: async ({ request }, use) => {
    await use(new ProductsApi(request));
  },
});

export { expect };
