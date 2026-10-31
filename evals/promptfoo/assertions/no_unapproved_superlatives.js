'use strict';
// Brand/legal rule: no superlative or absolute claim unless legal approved that exact
// phrase for this product (vars.approved_claims).
const { passed, failed, varsOf, text, quote, asList, norm } = require('./_lib');

const RULE = 'no_unapproved_superlatives';
const PATTERNS = [
  /\bbest\b[^.!?]{0,40}?\b(?:you(?:'|\u2019)?ll|you will) ever (?:own|need|buy|wear|carry)\b/gi,
  /\b(?:the )?best[^.!?]{0,20}?\bever(?: made)?\b/gi,
  /\b(?:world|industry)(?:'|\u2019)?s (?:best|finest|lightest|warmest|toughest)\b/gi,
  /(?:#1|\bnumber one\b|\bno\. 1\b)/gi,
  /\b(?:unbeatable|unmatched|unrivall?ed)\b/gi,
  /\b(?:100%|completely|totally|fully) waterproof\b/gi,
  /\b(?:indestructible|bulletproof|lasts forever|never wears out)\b/gi,
  /\blifetime (?:guarantee|warranty)\b/gi,
  /\bperfect for (?:everyone|every(?:body| trip| adventure))\b/gi,
  /\bthe (?:lightest|warmest|strongest|toughest|most durable)\b/gi,
];

function noUnapprovedSuperlatives(output, context) {
  const t = text(output);
  const approved = asList(varsOf(context).approved_claims).map(norm);
  const hits = [];
  for (const re of PATTERNS) {
    for (const m of t.matchAll(re)) {
      if (approved.some((a) => norm(m[0]).includes(a) || a.includes(norm(m[0])))) continue;
      const end = m.index + m[0].length;
      const overlap = hits.find((h) => m.index < h.index + h.text.length && h.index < end);
      if (!overlap) hits.push({ index: m.index, text: m[0] });
      else if (m[0].length > overlap.text.length) Object.assign(overlap, { index: m.index, text: m[0] }); // keep the longer span
    }
  }
  if (hits.length === 0) return passed(RULE);
  hits.sort((a, b) => a.index - b.index);
  return failed(RULE, hits.map((h) => quote(h.text)).join('; '));
}

module.exports = noUnapprovedSuperlatives;
module.exports.rule = RULE;
