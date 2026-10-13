import type { Download, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReturnsPage extends BasePage {
  readonly path = '/returns';
  readonly orderId: Locator;
  readonly reason: Locator;
  readonly photo: Locator;
  readonly photoInfo: Locator;
  readonly result: Locator;
  readonly labelLink: Locator;
  readonly priorities: Locator;

  constructor(page: Page) {
    super(page);
    this.orderId = page.getByLabel('Order number');
    this.reason = page.getByLabel('Reason');
    this.photo = page.getByLabel('Photo of the item (optional)');
    this.photoInfo = page.locator('#photo-info');
    this.result = page.locator('#return-result');
    this.labelLink = page.getByRole('link', { name: 'Download return label' });
    this.priorities = page.getByTestId('prio');
  }

  async submit(orderId: string, reasonLabel: string): Promise<void> {
    await this.orderId.fill(orderId);
    await this.reason.selectOption({ label: reasonLabel });
    await this.page.getByRole('button', { name: /Submit return|Send return request/ }).click();
  }

  async downloadLabel(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.labelLink.click();
    return downloadPromise;
  }
}
