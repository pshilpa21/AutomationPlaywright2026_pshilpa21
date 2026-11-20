import { randomUUID } from 'node:crypto';

export function createCheckoutTestData() {
  const id = randomUUID().replaceAll('-', '').slice(0, 12);

  return {
    account: {
      email: `ui-checkout-${id}@example.test`,
      password: 'AutomationPass123!',
      securityAnswer: 'Automation test answer',
    },
    address: {
      country: 'Testland',
      name: 'UI Automation Shopper',
      mobileNumber: '1234567890',
      zipCode: 'A1B2C3',
      streetAddress: '1 Automation Way',
      city: 'Test City',
      state: 'TS',
    },
    card: {
      name: 'UI Automation Shopper',
      number: '4111111111111111',
      month: '12',
      year: '2085',
    },
  } as const;
}
