import { test, expect } from '../../src/fixtures/api-test.js';
import { basketSchema, loginSchema } from '../../src/api/schemas.js';
import { apiTestUser, invalidApiCredentials } from '../data/api-authentication.js';

test.describe('Authentication API @api @regression', () => {
  test('rejects invalid credentials with an unauthorized response', async ({ authApi }) => {
    const response = await authApi.login(invalidApiCredentials);
    expect(response.status()).toBe(401);
    expect(await response.text()).toMatch(/invalid email or password/i);
  });

  test('rejects a login request when the password is missing', async ({ request }) => {
    const response = await request.post('/rest/user/login', { data: { email: apiTestUser.email } });
    expect(response.status()).toBe(401);
  });

  test('chains login token and basket ID into an authorized basket request', async ({ authApi, request }) => {
    const loginResponse = await authApi.login(apiTestUser);
    expect(loginResponse.status()).toBe(200);
    expect(loginResponse.headers()['content-type']).toContain('application/json');
    const authentication = loginSchema.parse(await loginResponse.json()).authentication;

    const basketResponse = await request.get(`/rest/basket/${authentication.bid}`, {
      headers: { Authorization: `Bearer ${authentication.token}` },
    });
    expect(basketResponse.status()).toBe(200);
    expect(basketSchema.parse(await basketResponse.json()).data.id).toBe(authentication.bid);
  });

  test('rejects access to a basket without an authentication token', async ({ request }) => {
    const response = await request.get('/rest/basket/1');
    expect(response.status()).toBe(401);
  });
});
