import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { loginSchema } from '../../src/api/schemas.js';

export async function createApiCustomer(request: APIRequestContext) {
  const id = randomUUID().replaceAll('-', '').slice(0, 16);
  const credentials = {
    email: `api-customer-${id}@example.test`,
    password: 'ApiAutomationPass123!',
  };

  const questionsResponse = await request.get('/api/SecurityQuestions');
  if (!questionsResponse.ok()) throw new Error(`Could not load registration security questions: HTTP ${questionsResponse.status()}`);
  const questions = await questionsResponse.json() as { data: Array<{ id: number; question: string }> };
  const securityQuestion = questions.data[0];
  if (!securityQuestion) throw new Error('Juice Shop returned no security questions for registration.');

  const registrationResponse = await request.post('/api/Users', {
    data: {
      email: credentials.email,
      password: credentials.password,
      passwordRepeat: credentials.password,
      securityQuestion,
      securityAnswer: 'API automation test answer',
    },
  });
  if (!registrationResponse.ok()) {
    throw new Error(`API customer registration failed: HTTP ${registrationResponse.status()} ${await registrationResponse.text()}`);
  }

  const loginResponse = await request.post('/rest/user/login', { data: credentials });
  if (!loginResponse.ok()) throw new Error(`API customer login failed: HTTP ${loginResponse.status()}`);
  const authentication = loginSchema.parse(await loginResponse.json()).authentication;

  return { ...credentials, token: authentication.token, basketId: authentication.bid };
}
