import type { Locator, Page } from '@playwright/test';

/**
 * An OFFLINE, rule-based locator healer, written for this repo as a measurable stand-in. It is NOT
 * Playwright's healer agent (that one is an LLM agent that reads traces; see docs/test-agents.md).
 *
 * Given a role and an accessible name that no longer match anything, it reads the page's aria
 * snapshot, scores every element of the same role by name similarity, and proposes the best one only
 * if the score clears a threshold and beats the runner-up by a margin. Refusing to heal is a valid
 * answer: when the element is really gone, healing would hide a bug.
 */
export interface HealProposal {
  healed: boolean;
  role: string;
  originalName: string;
  newName?: string;
  score?: number;
  reason: string;
}

const ROLE_LINE = /^\s*- (\w+) "([^"]*)"/;

function tokens(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Similarity in [0,1]: mean of token Dice overlap and a normalised edit similarity on the full name. */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const dice = ta.size + tb.size ? (2 * inter) / (ta.size + tb.size) : 0;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  const edit = 1 - d[x.length][y.length] / Math.max(x.length, y.length, 1);
  return (dice + edit) / 2;
}

export async function healByRole(page: Page, role: string, name: string, opts = { threshold: 0.45, margin: 0.08 }): Promise<HealProposal> {
  const snapshot = await page.locator('body').ariaSnapshot();
  const candidates = snapshot
    .split('\n')
    .map((l) => l.match(ROLE_LINE))
    .filter((m): m is RegExpMatchArray => !!m && m[1] === role)
    .map((m) => ({ name: m[2], score: nameSimilarity(name, m[2]) }))
    .sort((p, q) => q.score - p.score);
  if (!candidates.length) return { healed: false, role, originalName: name, reason: `no ${role} elements on the page` };
  const [best, second] = candidates;
  if (best.score < opts.threshold) return { healed: false, role, originalName: name, score: best.score, reason: 'no candidate is similar enough' };
  if (second && best.score - second.score < opts.margin) return { healed: false, role, originalName: name, score: best.score, reason: `ambiguous: '${best.name}' vs '${second.name}'` };
  return { healed: true, role, originalName: name, newName: best.name, score: best.score, reason: 'best candidate above threshold' };
}

export function locatorFor(page: Page, p: HealProposal): Locator {
  return page.getByRole(p.role as Parameters<Page['getByRole']>[0], { name: p.newName ?? p.originalName, exact: true });
}
