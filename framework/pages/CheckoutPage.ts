import type { FrameLocator, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutPage extends BasePage {
  readonly path = '/checkout';
  readonly payment: FrameLocator;
  readonly result: Locator;
  readonly payStatus: Locator;

  constructor(page: Page) {
    super(page);
    // The card field lives in an iframe; frameLocator scopes all locators into it.
    this.payment = page.frameLocator('iframe[title="Payment"]');
    this.result = page.locator('#result');
    this.payStatus = page.locator('#pay-status');
  }

  async fillAddress(name: string, address: string): Promise<void> {
    await this.page.getByLabel('Full name').fill(name);
    await this.page.getByLabel('Address').fill(address);
  }

  async addCard(number: string): Promise<void> {
    await this.payment.getByLabel('Card number').fill(number);
    await this.payment.getByRole('button', { name: 'Add card' }).click();
  }

  async placeOrder(): Promise<void> {
    await this.page.getByRole('button', { name: 'Place order' }).click();
  }
}
