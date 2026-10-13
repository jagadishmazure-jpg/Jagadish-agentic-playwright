import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { TestInfo } from '@playwright/test';
import type { Product } from '../api/LarkspurClient';

const ROOT = path.resolve(__dirname, '..', '..');

/** Unique per worker and retry so parallel tests never collide on shared data. */
export function uniqueSuffix(testInfo: TestInfo): string {
  return `${testInfo.parallelIndex}${testInfo.retry}${Date.now() % 1000}`.slice(-3).padStart(3, '0');
}

/** Product factory: valid defaults, override what the test cares about. */
export function makeProduct(testInfo: TestInfo, overrides: Partial<Product> = {}): Product {
  const n = uniqueSuffix(testInfo);
  return { sku: `LK-TST-${n}`, name: `Test Gaiter ${n}`, category: 'packs', price: 25, in_stock: true, rating: 4, ...overrides };
}

export function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

/** Minimal CSV reader for small fixtures and downloaded files (no quoted commas in this data). */
export function parseCsv(text: string): Record<string, string>[] {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const keys = head.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i], v])));
}
