import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type SortKey = 'Name' | 'Price' | 'Rating';

export class CatalogPage extends BasePage {
  readonly path = '/catalog';
  readonly category: Locator;
  readonly inStock: Locator;
  readonly cards: Locator;
  readonly resultCount: Locator;
  readonly feedItems: Locator;
  readonly feedEnd: Locator;

  constructor(page: Page) {
    super(page);
    this.category = page.getByLabel('Category');
    this.inStock = page.getByLabel('In stock only');
    this.cards = page.getByTestId('product-card');
    this.resultCount = page.getByTestId('result-count');
    this.feedItems = page.getByTestId('feed-item');
    this.feedEnd = page.getByText('You have reached the end.');
  }

  async filter(opts: { category?: string; inStockOnly?: boolean; sort?: SortKey }): Promise<void> {
    if (opts.category !== undefined) await this.category.selectOption({ label: opts.category });
    if (opts.inStockOnly !== undefined) await this.inStock.setChecked(opts.inStockOnly);
    if (opts.sort) await this.page.getByRole('radio', { name: opts.sort }).check();
  }

  card(name: string): Locator {
    return this.cards.filter({ has: this.page.getByRole('heading', { name }) });
  }

  async addToCart(name: string): Promise<void> {
    await this.page.getByRole('button', { name: `Add ${name} to cart` }).click();
  }

  /** Scrolls the feed until the end marker appears (infinite scroll). */
  async scrollFeedToEnd(maxRounds = 20): Promise<number> {
    for (let i = 0; i < maxRounds && !(await this.feedEnd.isVisible()); i++) {
      const before = await this.feedItems.count();
      await this.page.locator('#sentinel').scrollIntoViewIfNeeded();
      await this.page.waitForFunction((n) => document.querySelectorAll('[data-testid=feed-item]').length > n || !!document.querySelector('#feed-end:not([hidden])'), before);
    }
    return this.feedItems.count();
  }
}
