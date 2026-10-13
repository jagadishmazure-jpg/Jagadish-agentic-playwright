/**
 * Records tests/fixtures/products.har from the running demo app, then rewrites the recorded product
 * list to two fictional "recorded" items so the replay test can prove the data came from the HAR.
 *
 *   node scripts/record-har.mjs   (the app must be running on :8765)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from "@playwright/test";

const HAR = 'tests/fixtures/products.har';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:8765';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.routeFromHAR(HAR, { url: '**/api/products?*', update: true, updateContent: 'embed' });
  const page = await context.newPage();
  await page.goto(`${base}/catalog`);
  await page.getByTestId('product-card').first().waitFor();
  await context.close();
  await browser.close();

  const har = JSON.parse(readFileSync(HAR, 'utf8'));
  const recorded = [
    { sku: 'LK-HAR-001', name: 'Recorded Rain Hat', category: 'jackets', price: 24, in_stock: true, rating: 4.1 },
    { sku: 'LK-HAR-002', name: 'Recorded Trail Map', category: 'packs', price: 9, in_stock: true, rating: 4.9 },
  ];
  for (const e of har.log.entries) {
    e.response.content.text = JSON.stringify(recorded);
    e.response.content.size = e.response.content.text.length;
    delete e.response.content.encoding;
  }
  writeFileSync(HAR, JSON.stringify(har, null, 2) + '\n');
  console.log(`wrote ${HAR} with ${har.log.entries.length} entr${har.log.entries.length === 1 ? 'y' : 'ies'}`);
}

main();
