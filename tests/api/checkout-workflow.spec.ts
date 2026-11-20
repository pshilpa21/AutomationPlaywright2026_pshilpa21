import { test, expect } from '../../src/fixtures/api-test.js';
import { createApiCustomer } from '../support/api-customer.js';
import { productListSchema } from '../../src/api/schemas.js';

test.describe('Checkout API workflow @api @regression', () => {
  test('creates an order and verifies it through order history', async ({ request, productsApi }) => {
    const customer = await createApiCustomer(request);
    const authorization = { Authorization: `Bearer ${customer.token}` };

    const products = productListSchema.parse(await (await productsApi.getAll()).json()).data;
    const product = products.find(({ name }) => name === 'Apple Juice (1000ml)');
    expect(product).toBeDefined();

    const addressResponse = await request.post('/api/Addresss', {
      headers: authorization,
      data: {
        country: 'Testland',
        fullName: 'API Automation Shopper',
        mobileNum: '1234567890',
        zipCode: 'A1B2C3',
        streetAddress: '1 API Test Way',
        city: 'Test City',
        state: 'TS',
      },
    });
    expect(addressResponse.ok()).toBe(true);
    const address = await addressResponse.json() as { data: { id: number } };

    const cardResponse = await request.post('/api/Cards', {
      headers: authorization,
      data: {
        fullName: 'API Automation Shopper',
        cardNum: '4111111111111111',
        expMonth: 12,
        expYear: 2099,
      },
    });
    expect(cardResponse.ok()).toBe(true);
    const card = await cardResponse.json() as { data: { id: number } };

    const deliveryResponse = await request.get('/api/Deliverys');
    expect(deliveryResponse.status()).toBe(200);
    const deliveries = await deliveryResponse.json() as { data: Array<{ id: number }> };
    expect(deliveries.data.length).toBeGreaterThan(0);

    const basketItemResponse = await request.post('/api/BasketItems', {
      headers: authorization,
      data: { ProductId: product!.id, BasketId: customer.basketId, quantity: 1 },
    });
    expect(basketItemResponse.ok()).toBe(true);

    const checkoutResponse = await request.post(`/rest/basket/${customer.basketId}/checkout`, {
      headers: authorization,
      data: {
        orderDetails: {
          addressId: address.data.id,
          paymentId: card.data.id,
          deliveryMethodId: deliveries.data[0].id,
        },
      },
    });
    expect(checkoutResponse.status()).toBe(200);
    expect(checkoutResponse.headers()['content-type']).toContain('application/json');
    const confirmation = await checkoutResponse.json() as { orderConfirmation: string };
    expect(confirmation.orderConfirmation).toBeTruthy();

    const historyResponse = await request.get('/rest/order-history', { headers: authorization });
    expect(historyResponse.status()).toBe(200);
    const history = await historyResponse.json() as { status: string; data: Array<{ orderId: string; products: Array<{ id: number }> }> };
    expect(history.status).toBe('success');
    expect(history.data).toContainEqual(expect.objectContaining({
      orderId: confirmation.orderConfirmation,
      products: expect.arrayContaining([expect.objectContaining({ id: product!.id })]),
    }));
  });
});
