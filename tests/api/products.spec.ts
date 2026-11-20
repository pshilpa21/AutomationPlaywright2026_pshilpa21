import { test, expect } from '../../src/fixtures/api-test.js';
import { productListSchema, singleProductResponseSchema } from '../../src/api/schemas.js';

test.describe('Products API @api @regression', () => {
  test('returns a successful JSON collection that matches the product schema', async ({ productsApi }) => {
    const response = await productsApi.getAll();
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const parsed = productListSchema.safeParse(await response.json());
    expect(parsed.success, 'Product collection must satisfy the response contract').toBe(true);
    if (parsed.success) expect(parsed.data.data.length).toBeGreaterThan(0);
  });

  test('chains product list to product detail using the returned ID', async ({ productsApi }) => {
    const listResponse = await productsApi.getAll();
    expect(listResponse.status()).toBe(200);
    const list = productListSchema.parse(await listResponse.json());
    const selectedProduct = list.data.find((product) => product.name === 'Apple Juice (1000ml)');
    expect(selectedProduct).toBeDefined();

    const detailResponse = await productsApi.getById(selectedProduct!.id);
    expect(detailResponse.status()).toBe(200);
    expect(singleProductResponseSchema.parse(await detailResponse.json()).data).toMatchObject({
      id: selectedProduct!.id,
      name: selectedProduct!.name,
      price: selectedProduct!.price,
    });
  });

  test('searches by full product name using encoded query parameters', async ({ productsApi }) => {
    const response = await productsApi.search('Apple Juice (1000ml)');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const result = productListSchema.parse(await response.json());
    expect(result.data.map((product) => product.name)).toContain('Apple Juice (1000ml)');
  });

  test('searches by partial term without requiring an exact match', async ({ productsApi }) => {
    const response = await productsApi.search('apple');
    expect(response.status()).toBe(200);
    const result = productListSchema.parse(await response.json());
    expect(result.data.some((product) => /apple/i.test(`${product.name} ${product.description}`))).toBe(true);
  });

  test('returns an empty data array for a search with no matches', async ({ productsApi }) => {
    const response = await productsApi.search(`no-such-juice-${Date.now()}`);
    expect(response.status()).toBe(200);
    expect(productListSchema.parse(await response.json()).data).toEqual([]);
  });

  test('treats an empty or omitted search query as the full catalog', async ({ productsApi }) => {
    const [allResponse, emptyResponse, omittedResponse] = await Promise.all([
      productsApi.getAll(),
      productsApi.search(''),
      productsApi.search(),
    ]);
    expect(allResponse.status()).toBe(200);
    expect(emptyResponse.status()).toBe(200);
    expect(omittedResponse.status()).toBe(200);

    const all = productListSchema.parse(await allResponse.json()).data;
    const empty = productListSchema.parse(await emptyResponse.json()).data;
    const omitted = productListSchema.parse(await omittedResponse.json()).data;
    expect(empty).toHaveLength(all.length);
    expect(omitted).toHaveLength(all.length);
  });

  test('handles a query beyond the documented search length cap', async ({ productsApi }) => {
    const response = await productsApi.search('z'.repeat(250));
    expect(response.status()).toBe(200);
    expect(productListSchema.parse(await response.json()).data).toEqual([]);
  });

  test('checks offset and limit behavior on the product collection', async ({ productsApi }) => {
    const [allResponse, firstWindowResponse, nextWindowResponse] = await Promise.all([
      productsApi.getAll(),
      productsApi.getAll({ limit: '5', offset: '0' }),
      productsApi.getAll({ limit: '5', offset: '5' }),
    ]);
    expect(allResponse.status()).toBe(200);
    expect(firstWindowResponse.status()).toBe(200);
    expect(nextWindowResponse.status()).toBe(200);

    const allIds = productListSchema.parse(await allResponse.json()).data.map((product) => product.id);
    const firstWindowIds = productListSchema.parse(await firstWindowResponse.json()).data.map((product) => product.id);
    const nextWindowIds = productListSchema.parse(await nextWindowResponse.json()).data.map((product) => product.id);
    // The local target honors offset but currently ignores limit, so it cannot cap page size.
    expect(firstWindowIds).toEqual(allIds);
    expect(nextWindowIds).toEqual(allIds.slice(5));
  });

  test('meets the local product-list response-time budget', async ({ productsApi }) => {
    const startedAt = performance.now();
    const response = await productsApi.getAll();
    const elapsedMs = performance.now() - startedAt;
    expect(response.status()).toBe(200);
    expect(elapsedMs, `GET /api/Products took ${elapsedMs.toFixed(0)} ms`).toBeLessThan(5_000);
  });
});
