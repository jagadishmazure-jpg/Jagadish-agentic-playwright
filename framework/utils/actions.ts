import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Small reusable helpers. Each is wrapped in a boxed test.step so the report shows one readable step
 * and errors point at the caller, not at this file.
 */
export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  await test.step(`fill form (${Object.keys(fields).join(', ')})`, async () => {
    for (const [label, value] of Object.entries(fields)) await page.getByLabel(label, { exact: true }).fill(value);
  }, { box: true });
}

export async function clickAndWaitForResponse(page: Page, target: Locator, urlPart: string, status = 200) {
  return test.step(`click and wait for ${urlPart}`, async () => {
    const [resp] = await Promise.all([page.waitForResponse((r) => r.url().includes(urlPart)), target.click()]);
    expect(resp.status(), `status of ${urlPart}`).toBe(status);
    return resp;
  }, { box: true });
}

/** Reads a rendered table into objects keyed by header text. */
export async function readTable(table: Locator): Promise<Record<string, string>[]> {
  return table.evaluate((t) => {
    const heads = Array.from(t.querySelectorAll('thead th'), (th) => (th.textContent ?? '').trim());
    return Array.from(t.querySelectorAll('tbody tr'), (tr) => Object.fromEntries(Array.from(tr.querySelectorAll('td'), (td, i) => [heads[i], (td.textContent ?? '').trim()])));
  });
}

/** Resolve after `ms` milliseconds. Only for simulating a slow server inside a route handler, never as a wait in a test. */
export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
