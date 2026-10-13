import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface OrderRow { order: string; items: number; total: number; status: string }

export class OrdersPage extends BasePage {
  readonly path = '/orders';
  readonly table: Locator;
  readonly message: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.getByRole('table', { name: 'Orders' });
    this.message = page.locator('#orders-msg');
  }

  /** Reads the table into typed rows so specs can assert on data rather than on DOM. */
  async rows(): Promise<OrderRow[]> {
    const cells = await this.table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll('td'), (td) => td.textContent ?? '')));
    return cells.map(([order, items, total, status]) => ({ order, items: Number(items), total: Number(total.replace('$', '')), status }));
  }

  async sortBy(column: 'Order' | 'Total'): Promise<void> {
    await this.table.getByRole('button', { name: column }).click();
  }
}
