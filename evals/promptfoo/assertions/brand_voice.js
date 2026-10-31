'use strict';
// Brand voice: calm and factual. No exclamation marks, no shouting in capitals,
// no sales pressure. Approved acronyms are allowed (defaults plus vars.allowed_caps).
const { passed, failed, varsOf, text, quote, asList } = require('./_lib');

const RULE = 'brand_voice';
const DEFAULT_CAPS = ['UV', 'UPF', 'DWR', 'PFAS', 'PFC', 'BPA', 'USB', 'LED', 'XL', 'XXL'];
const PRESSURE = /\b(buy (?:it )?now|order (?:yours )?(?:now|today)|hurry|don(?:'|\u2019)?t miss(?: out)?|limited time|act fast|while stocks? lasts?)\b/gi;

function brandVoice(output, context) {
  const t = text(output);
  const allowed = new Set([...DEFAULT_CAPS, ...asList(varsOf(context).allowed_caps)]);
  const hits = [];
  for (const m of t.matchAll(/[^.!?]*!+/g)) hits.push({ index: m.index, text: m[0].trim().split(/\s+/).slice(-6).join(' ') });
  for (const m of t.matchAll(/\b[A-Z]{3,}\b/g)) if (!allowed.has(m[0])) hits.push({ index: m.index, text: m[0] });
  for (const m of t.matchAll(PRESSURE)) hits.push({ index: m.index, text: m[0] });
  if (hits.length === 0) return passed(RULE);
  hits.sort((a, b) => a.index - b.index);
  return failed(RULE, [...new Set(hits.map((h) => quote(h.text)))].join('; '));
}

module.exports = brandVoice;
module.exports.rule = RULE;
