import type { APIRequestContext, APIResponse } from '@playwright/test';

export type LoginCredentials = { email: string; password: string };

export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  login(credentials: LoginCredentials): Promise<APIResponse> {
    return this.request.post('/rest/user/login', { data: credentials });
  }
}
