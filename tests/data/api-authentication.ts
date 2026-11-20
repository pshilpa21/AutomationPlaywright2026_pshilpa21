// Seeded Juice Shop training account. Keep API tests read-only after authentication.
export const apiTestUser = {
  email: 'jim@juice-sh.op',
  password: 'ncc-1701',
} as const;

export const invalidApiCredentials = {
  email: 'api-test-user-does-not-exist@example.invalid',
  password: 'DefinitelyWrong123!',
} as const;
