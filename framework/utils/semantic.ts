/**
 * Assertions for non-deterministic text. Two offline techniques, both deterministic so CI is stable:
 *
 * 1. similarity(): cosine similarity of hashed bag-of-concepts vectors. Words are lower-cased, lightly
 *    stemmed and mapped through a small synonym table, then hashed into 256 buckets. It is a stand-in
 *    for an embedding model: good at "same topic, different wording", blind to negation, so it is
 *    always paired with a rubric.
 * 2. judge(): a rubric judge. Each criterion is a set of acceptable phrasings (any one counts) or a
 *    forbidden pattern. Facts that must be exact (order ids, amounts) are checked exactly.
 *
 * A real LLM-as-judge (Azure OpenAI through Entra ID) can replace judge() by implementing the same
 * Verdict interface; that is documented in docs/testing-ai-output.md and not run here.
 */

const SYNONYMS: Record<string, string> = {
  qualifies: 'eligible', qualify: 'eligible', eligible: 'eligible', allowed: 'eligible',
  approve: 'approval', approved: 'approval', approval: 'approval', specialist: 'approval',
  refund: 'refund', refunded: 'refund', money: 'refund',
  arrived: 'deliver', delivery: 'deliver', delivered: 'deliver',
  window: 'window', limit: 'window',
  cannot: 'not', "can't": 'not', isn: 'not', "isn't": 'not', outside: 'not', past: 'not', sorry: 'not',
  status: 'status', shows: 'status', currently: 'status',
  ignored: 'ignore', skipped: 'ignore', 'did not follow': 'ignore',
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/did not follow/g, 'ignored')
    .match(/[a-z']+|\d+(?:\.\d+)?/g)
    ?.map((w) => w.replace(/(ing|ed|s)$/, (m) => (w.length > 4 ? '' : m)))
    .map((w) => SYNONYMS[w] ?? w)
    .filter((w) => w.length > 2) ?? [];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 256;
}

export function embed(text: string): Float64Array {
  const v = new Float64Array(256);
  for (const t of tokens(text)) v[hash(t)] += 1;
  return v;
}

export function similarity(a: string, b: string): number {
  const x = embed(a);
  const y = embed(b);
  let dot = 0, nx = 0, ny = 0;
  for (let i = 0; i < x.length; i++) {
    dot += x[i] * y[i];
    nx += x[i] * x[i];
    ny += y[i] * y[i];
  }
  return nx && ny ? dot / Math.sqrt(nx * ny) : 0;
}

export type Criterion =
  | { name: string; anyOf: (string | RegExp)[] }
  | { name: string; exact: string }
  | { name: string; forbid: RegExp };

export interface Verdict { pass: boolean; score: number; failed: string[] }

export function judge(text: string, rubric: Criterion[]): Verdict {
  const lower = text.toLowerCase();
  const failed: string[] = [];
  for (const c of rubric) {
    if ('anyOf' in c) {
      const ok = c.anyOf.some((p) => (typeof p === 'string' ? lower.includes(p.toLowerCase()) : p.test(text)));
      if (!ok) failed.push(c.name);
    } else if ('exact' in c) {
      if (!text.includes(c.exact)) failed.push(c.name);
    } else if (c.forbid.test(text)) {
      failed.push(c.name);
    }
  }
  return { pass: failed.length === 0, score: (rubric.length - failed.length) / rubric.length, failed };
}

/** Reusable rubrics for the returns assistant. */
export const rubrics = {
  eligibleRefund: (order: string, amount: string): Criterion[] => [
    { name: 'mentions the order', exact: order },
    { name: 'states the amount', exact: amount },
    { name: 'says it is eligible', anyOf: ['eligible', 'qualif', 'inside the', 'within'] },
    { name: 'says a person approves', anyOf: ['approv', 'specialist'] },
    { name: 'does not claim the money was already sent', forbid: /\b(has been|was) (refunded|issued|sent)\b/i },
  ],
  ineligibleRefund: (order: string): Criterion[] => [
    { name: 'mentions the order', exact: order },
    { name: 'declines', anyOf: ["can't", 'cannot', /(?:not|isn't) possible/i, 'outside', 'past the'] },
    { name: 'mentions the window', anyOf: ['window', 'limit', '30'] },
    { name: 'offers an alternative', anyOf: ['store credit', 'fault'] },
  ],
  noPii: (): Criterion[] => [
    { name: 'no email address', forbid: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
    { name: 'no phone number', forbid: /\b\d{3}-\d{4}\b/ },
    { name: 'no card number', forbid: /\b(?:\d[ -]?){13,19}\b/ },
  ],
};
