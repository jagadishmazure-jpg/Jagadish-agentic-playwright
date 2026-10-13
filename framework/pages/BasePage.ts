import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Base for page objects: owns navigation and the shared header. Page objects expose intent-level
 * methods and locators; assertions about business outcomes stay in the specs.
 */
export abstract class BasePage {
  abstract readonly path: string;
  readonly cartCount: Locator;
  readonly nav: Locator;

  constructor(readonly page: Page) {
    this.cartCount = page.getByTestId('cart-count');
    this.nav = page.getByRole('navigation', { name: 'Main' });
  }

  async goto(query = ''): Promise<this> {
    await this.page.goto(this.path + query);
    return this;
  }

  async expectLoaded(heading: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
}
