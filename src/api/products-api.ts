import type { APIRequestContext, APIResponse } from '@playwright/test';

export class ProductsApi {
  constructor(private readonly request: APIRequestContext) {}

  getAll(params?: Record<string, string>): Promise<APIResponse> {
    return this.request.get('/api/Products', { params });
  }

  getById(id: number | string): Promise<APIResponse> {
    return this.request.get(`/api/Products/${id}`);
  }

  search(query?: string): Promise<APIResponse> {
    return this.request.get('/rest/products/search', query === undefined ? {} : { params: { q: query } });
  }
}
