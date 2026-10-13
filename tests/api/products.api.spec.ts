import { makeProduct } from '../../framework/utils/data';
import { expect, test } from '../../framework/fixtures';

test.describe('products API (no browser)', () => {
  test('GET list with filters and sorting', async ({ api }) => {
    const boots = await api.products({ category: 'boots', sort: 'price' });
    expect(boots.map((b) => b.sku)).toEqual(['LK-BOT-002', 'LK-BOT-001', 'LK-BOT-003']);
    const inStock = await api.products({ in_stock: true });
    expect(inStock.every((p) => p.in_stock)).toBe(true);
  });

  test('GET one product has the expected shape', async ({ api }) => {
    const p = await api.product('LK-JKT-001');
    expect(p).toEqual({
      sku: 'LK-JKT-001',
      name: 'Ridgeline Rain Shell',
      category: 'jackets',
      price: expect.any(Number),
      in_stock: true,
      rating: expect.any(Number),
      reviews: expect.arrayContaining([expect.objectContaining({ author: expect.any(String), stars: expect.any(Number) })]),
    });
  });

  test('POST, PUT, PATCH, DELETE as staff', async ({ staffApi }, testInfo) => {
    const p = makeProduct(testInfo);
    expect(await staffApi.createProduct(p)).toEqual(p);
    await staffApi.createProduct(p, 409);
    expect(await staffApi.replaceProduct({ ...p, name: 'Replaced Gaiter', price: 40 })).toMatchObject({ name: 'Replaced Gaiter', price: 40 });
    expect(await staffApi.patchProduct(p.sku, { in_stock: false })).toMatchObject({ in_stock: false, price: 40 });
    await staffApi.deleteProduct(p.sku);
    await staffApi.deleteProduct(p.sku, 404);
  });

  test('authorisation: anonymous 401, customer 403', async ({ api, env }, testInfo) => {
    const p = makeProduct(testInfo);
    await api.createProduct(p, 401);
    await api.login(env.users.customer.username, env.users.customer.password);
    await api.createProduct(p, 403);
  });

  test('validation errors return 422', async ({ staffApi, request }) => {
    const bad = await request.post('/api/products', { data: { sku: 'nope', name: 'x', category: 'packs', price: -1 }, headers: { Authorization: 'Bearer invalid' } });
    expect(bad.status()).toBe(422);
    const badSort = await request.get('/api/products', { params: { sort: 'colour' } });
    expect(badSort.status()).toBe(422);
    expect(staffApi).toBeTruthy();
  });

  test('orders are scoped to the caller', async ({ api, env }) => {
    await api.login(env.users.customer2.username, env.users.customer2.password);
    const orders = await api.orders();
    expect(orders.map((o) => o.order_id).sort()).toEqual(['LK-1003', 'LK-1004']);
  });

  test('response time and headers', async ({ request }) => {
    const t0 = Date.now();
    const r = await request.get('/api/products');
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
    expect(r.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
  });
});
