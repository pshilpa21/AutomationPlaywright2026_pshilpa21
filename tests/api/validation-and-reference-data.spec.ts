import { test, expect } from '../../src/fixtures/api-test.js';

test.describe('API validation and reference data @api @regression', () => {
  test('rejects user registration with empty required credentials', async ({ request }) => {
    const response = await request.post('/api/Users', {
      data: { email: '', password: '', passwordRepeat: '' },
    });
    expect(response.status()).toBe(400);
    expect(await response.text()).toMatch(/cannot be empty/i);
  });

  test('returns available security questions as JSON reference data', async ({ request }) => {
    const response = await request.get('/api/SecurityQuestions');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json() as { status: string; data: Array<{ id: number; question: string }> };
    expect(body.status).toBe('success');
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every(({ id, question }) => Number.isInteger(id) && question.length > 0)).toBe(true);
  });

  test('returns delivery methods as JSON reference data', async ({ request }) => {
    const response = await request.get('/api/Deliverys');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json() as { status: string; data: unknown[] };
    expect(body.status).toBe('success');
    expect(body.data.length).toBeGreaterThan(0);
  });
});
