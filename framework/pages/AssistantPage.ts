import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface AnswerResult {
  text: string;
  tools: string[];
  citations: string[];
  notices: string[];
  firstTokenMs: number;
  totalMs: number;
  serverLatencyMs: number;
}

/**
 * Page object for an AI chat UI. Answers stream in and change wording between seeds, so this object
 * returns structured results (text, tools used, citations, notices, timings) and leaves judging the
 * meaning to semantic assertions in framework/utils/semantic.ts.
 */
export class AssistantPage extends BasePage {
  readonly path = '/assistant';
  readonly input: Locator;
  readonly send: Locator;
  readonly answers: Locator;
  readonly approvalDialog: Locator;
  readonly status: Locator;

  constructor(page: Page) {
    super(page);
    this.input = page.getByLabel('Your message');
    this.send = page.getByRole('button', { name: 'Send' });
    this.answers = page.getByTestId('answer');
    this.approvalDialog = page.getByRole('dialog', { name: 'Refund needs approval' });
    this.status = page.locator('#state');
  }

  async open(seed = 0): Promise<this> {
    return this.goto(`?seed=${seed}`);
  }

  async ask(message: string, opts: { timeout?: number } = {}): Promise<AnswerResult> {
    const index = await this.answers.count();
    const t0 = Date.now();
    await this.input.fill(message);
    await this.send.click();
    const answer = this.answers.nth(index);
    const text = answer.getByTestId('answer-text');
    // Streaming: first token = the text is no longer empty. Web-first assertion, no sleeps.
    await expect(text).not.toBeEmpty({ timeout: opts.timeout ?? 10_000 });
    const firstTokenMs = Date.now() - t0;
    await expect(answer).toHaveAttribute('data-done', 'true', { timeout: opts.timeout ?? 15_000 });
    const totalMs = Date.now() - t0;
    return {
      text: (await text.textContent())?.trim() ?? '',
      tools: await answer.getByTestId('tool-call').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.tool ?? '')),
      citations: (await answer.getByTestId('citation').allTextContents()).map((c) => c.match(/\[([^\]]+)\]/)?.[1] ?? c),
      notices: await answer.getByTestId('notice').allTextContents(),
      firstTokenMs,
      totalMs,
      serverLatencyMs: Number(await answer.getAttribute('data-latency')),
    };
  }
}
