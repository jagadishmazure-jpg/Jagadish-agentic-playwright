import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export interface Product { sku: string; name: string; category: string; price: number; in_stock: boolean; rating: number }
export interface ProductDetail extends Product { reviews: { author: string; stars: number; text: string }[] }
export interface Order { order_id: string; items: string[]; total: number; status: string }
export interface ChatEvent { type: string; [k: string]: unknown }
export interface Approval { id: string; order_id: string; amount: number; status: 'pending' | 'approved' | 'denied'; decided_by: string }

/**
 * Typed client over Playwright's APIRequestContext. Each method returns parsed, typed data and fails
 * with a readable message when the status is not what the caller expects.
 */
export class LarkspurClient {
  private token = '';

  constructor(private readonly request: APIRequestContext) {}

  private headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private async json<T>(resp: APIResponse, expected = 200): Promise<T> {
    expect(resp.status(), `${resp.url()} -> ${await resp.text()}`).toBe(expected);
    return (expected === 204 ? undefined : await resp.json()) as T;
  }

  async login(username: string, password: string): Promise<{ access_token: string; session: string }> {
    const body = await this.json<{ access_token: string; session: string }>(await this.request.post('/api/auth/token', { data: { username, password } }));
    this.token = body.access_token;
    return body;
  }

  raw(): APIRequestContext {
    return this.request;
  }

  async health(): Promise<{ ok: boolean }> {
    return this.json(await this.request.get('/healthz'));
  }

  async products(params: { category?: string; in_stock?: boolean; sort?: 'name' | 'price' | 'rating' } = {}): Promise<Product[]> {
    const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return this.json(await this.request.get('/api/products', { params: query }));
  }

  async product(sku: string): Promise<ProductDetail> {
    return this.json(await this.request.get(`/api/products/${sku}`));
  }

  async createProduct(p: Product, expected = 201): Promise<Product> {
    return this.json(await this.request.post('/api/products', { data: p, headers: this.headers() }), expected);
  }

  async replaceProduct(p: Product): Promise<Product> {
    return this.json(await this.request.put(`/api/products/${p.sku}`, { data: p, headers: this.headers() }));
  }

  async patchProduct(sku: string, patch: Partial<Pick<Product, 'name' | 'price' | 'in_stock'>>): Promise<Product> {
    return this.json(await this.request.patch(`/api/products/${sku}`, { data: patch, headers: this.headers() }));
  }

  async deleteProduct(sku: string, expected = 204): Promise<void> {
    await this.json(await this.request.delete(`/api/products/${sku}`, { headers: this.headers() }), expected);
  }

  async orders(): Promise<Order[]> {
    return this.json(await this.request.get('/api/orders', { headers: this.headers() }));
  }

  /** Calls the streaming chat endpoint and parses the whole SSE body into events. */
  async chat(message: string, seed = 0): Promise<ChatEvent[]> {
    const resp = await this.request.post('/api/chat', { data: { message, seed } });
    expect(resp.headers()['content-type']).toContain('text/event-stream');
    return parseSse(await resp.text());
  }

  async approvals(): Promise<Approval[]> {
    return this.json(await this.request.get('/api/approvals'));
  }

  async decide(id: string, approve: boolean, expected = 200): Promise<Approval> {
    return this.json(await this.request.post(`/api/approvals/${id}`, { data: { approve }, headers: this.headers() }), expected);
  }

  async reset(): Promise<void> {
    await this.json(await this.request.post('/api/test/reset'));
  }
}

export function parseSse(body: string): ChatEvent[] {
  return body
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.slice(6)) as ChatEvent);
}

export function answerText(events: ChatEvent[]): string {
  return events.filter((e) => e.type === 'token').map((e) => String(e.text)).join('').trim();
}
