import { test, expect } from '../../src/fixtures/api-test.js';
import { createApiCustomer } from '../support/api-customer.js';
import { productListSchema } from '../../src/api/schemas.js';

test.describe('Account and basket API workflows @api @regression', () => {
  test('registers a unique customer, rejects duplicate email, and signs in', async ({ request }) => {
    const customer = await createApiCustomer(request);

    const duplicateResponse = await request.post('/api/Users', {
      data: {
        email: customer.email,
        password: customer.password,
        passwordRepeat: customer.password,
        securityQuestion: { id: 1 },
        securityAnswer: 'API automation test answer',
      },
    });
    expect(duplicateResponse.ok(), 'A duplicate email must not create a second account').toBe(false);

    const profileResponse = await request.get('/rest/user/whoami', {
      headers: { Cookie: `token=${customer.token}` },
    });
    expect(profileResponse.status()).toBe(200);
    const profile = await profileResponse.json() as { user: { email?: string } };
    expect(profile.user.email).toBe(customer.email);
  });

  test('adds, updates, reads, and removes a basket item with stock validation', async ({ request, productsApi }) => {
    const customer = await createApiCustomer(request);
    const authorization = { Authorization: `Bearer ${customer.token}` };
    const productsResponse = await productsApi.getAll();
    const products = productListSchema.parse(await productsResponse.json()).data;
    const product = products.find(({ name }) => name === 'Apple Juice (1000ml)');
    expect(product).toBeDefined();

    const rejectedQuantity = await request.post('/api/BasketItems', {
      headers: authorization,
      data: { ProductId: product!.id, BasketId: customer.basketId, quantity: 99_999 },
    });
    expect(rejectedQuantity.status()).toBe(400);

    const addedResponse = await request.post('/api/BasketItems', {
      headers: authorization,
      data: { ProductId: product!.id, BasketId: customer.basketId, quantity: 1 },
    });
    expect(addedResponse.ok()).toBe(true);
    const added = await addedResponse.json() as { data: { id: number; quantity: number } };
    expect(added.data.quantity).toBe(1);

    try {
      const updatedResponse = await request.put(`/api/BasketItems/${added.data.id}`, {
        headers: authorization,
        data: { quantity: 2 },
      });
      expect(updatedResponse.ok()).toBe(true);
      expect((await updatedResponse.json() as { data: { quantity: number } }).data.quantity).toBe(2);

      const basketResponse = await request.get(`/rest/basket/${customer.basketId}`, { headers: authorization });
      expect(basketResponse.status()).toBe(200);
      const basket = await basketResponse.json() as { data: { Products: Array<{ id: number; BasketItem: { quantity: number } }> } };
      expect(basket.data.Products).toContainEqual(expect.objectContaining({
        id: product!.id,
        BasketItem: expect.objectContaining({ quantity: 2 }),
      }));
    } finally {
      await request.delete(`/api/BasketItems/${added.data.id}`, { headers: authorization });
    }

    const emptyBasketResponse = await request.get(`/rest/basket/${customer.basketId}`, { headers: authorization });
    const emptyBasket = await emptyBasketResponse.json() as { data: { Products: unknown[] } };
    expect(emptyBasket.data.Products).toHaveLength(0);
  });
});
