import { readTable } from '../../framework/utils/actions';
import { AUTH, expect, test } from '../../framework/fixtures';

test.describe('tables and infinite scroll', () => {
  test.use({ storageState: AUTH.specialist });

  test('validate table data dynamically and after sorting', async ({ ordersPage }) => {
    await ordersPage.goto();
    await expect(ordersPage.message).toHaveText('4 orders');
    const rows = await ordersPage.rows();
    expect(rows.map((r) => r.order)).toEqual(['LK-1001', 'LK-1002', 'LK-1003', 'LK-1004']);
    expect(rows.find((r) => r.order === 'LK-1003')).toEqual({ order: 'LK-1003', items: 2, total: 268, status: 'delivered' });
    await ordersPage.sortBy('Total');
    const totals = (await ordersPage.rows()).map((r) => r.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    const byHeader = await readTable(ordersPage.table);
    expect(byHeader[0]).toMatchObject({ Total: '$268.00', Status: 'delivered' });
  });

  test('infinite scroll loads every page until the end marker', async ({ catalogPage }) => {
    await catalogPage.goto();
    const total = await catalogPage.scrollFeedToEnd();
    expect(total).toBe(60);
    await expect(catalogPage.feedEnd).toBeVisible();
  });
});
