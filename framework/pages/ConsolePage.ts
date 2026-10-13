import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** The returns specialist's approval console. */
export class ConsolePage extends BasePage {
  readonly path = '/console';
  readonly queue: Locator;
  readonly message: Locator;

  constructor(page: Page) {
    super(page);
    this.queue = page.getByRole('table', { name: 'Pending approvals' });
    this.message = page.locator('#console-msg');
  }

  async decide(requestId: string, approve: boolean): Promise<void> {
    await this.page.getByRole('button', { name: `${approve ? 'Approve' : 'Deny'} ${requestId}` }).click();
  }
}
