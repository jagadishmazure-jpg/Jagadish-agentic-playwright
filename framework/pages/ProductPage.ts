import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  readonly path = '/product';
  readonly name: Locator;
  readonly price: Locator;
  readonly reviews: Locator;
  /** The rating is a web component with an open shadow root; role and CSS locators pierce it. */
  readonly ratingStars: Locator;
  readonly helpful: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByRole('heading', { level: 1 });
    this.price = page.locator('#price');
    this.reviews = page.locator('li.review');
    this.ratingStars = page.locator('lk-rating').getByRole('img');
    this.helpful = page.locator('lk-rating').getByRole('button', { name: 'Helpful?' });
  }

  async open(sku: string): Promise<this> {
    await this.goto(`?sku=${encodeURIComponent(sku)}`);
    await expect(this.page.locator('#product')).toHaveAttribute('aria-busy', 'false');
    return this;
  }

  /** The size guide opens in a popup; wait for the event before clicking. */
  async openSizeGuide(): Promise<Page> {
    const popupPromise = this.page.waitForEvent('popup');
    await this.page.getByRole('button', { name: 'Size guide' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    return popup;
  }
}
