import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  readonly path = '/cart';
  readonly rows: Locator;
  readonly total: Locator;

  constructor(page: Page) {
    super(page);
    this.rows = page.getByRole('table', { name: 'Cart items' }).locator('tbody tr');
    this.total = page.getByTestId('cart-total');
  }

  /** Removing asks for confirmation through window.confirm. Playwright dismisses dialogs by default, so accept explicitly. */
  async remove(name: string, accept = true): Promise<string> {
    let message = '';
    this.page.once('dialog', async (d) => {
      message = d.message();
      await (accept ? d.accept() : d.dismiss());
    });
    await this.page.getByRole('button', { name: `Remove ${name}` }).click();
    return message;
  }
}
