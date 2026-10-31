'use strict';
// Catalog rule: every material the copy names must be a material the catalog lists for
// this product (vars.materials). "full-grain leather" on a top-grain wallet fails.
const { passed, failed, varsOf, text, quote, asList, norm } = require('./_lib');

const RULE = 'material_claim_matches_catalog';
// Specific terms must match a catalog material exactly. Longest first so
// "full-grain leather" is consumed before "leather".
const SPECIFIC = [
  'recycled polyester fleece', 'organic cotton canvas', 'responsibly sourced down', 'polyurethane membrane',
  'full-grain leather', 'top-grain leather', 'genuine leather', 'vegan leather', 'recycled polyester',
  'recycled nylon', 'ripstop nylon', 'organic cotton', 'merino wool', 'stainless steel', 'carbon fiber',
  'goose down', 'duck down', 'cashmere', 'titanium', 'aluminum', 'suede', 'silk', 'bamboo', 'rubber',
].sort((a, b) => b.length - a.length);
// Generic words pass if any catalog material contains them ("leather" needs a non-vegan leather).
const GENERIC = ['leather', 'wool', 'cotton', 'canvas', 'nylon', 'polyester', 'fleece', 'steel'];

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ -]/g, '[ -]');
}

function covered(term, catalog, generic) {
  if (!generic) return catalog.includes(term);
  return catalog.some((m) => new RegExp(`\\b${term}\\b`).test(m) && !(term === 'leather' && m.startsWith('vegan ')));
}

function materialClaimMatchesCatalog(output, context) {
  const catalog = asList(varsOf(context).materials).map(norm);
  const original = text(output);
  let t = original; // matched spans are blanked out (same length) so offsets stay true
  const bad = [];
  for (const [list, generic] of [[SPECIFIC, false], [GENERIC, true]]) {
    for (const term of list) {
      const re = new RegExp(`\\b${escape(term)}\\b`, 'gi');
      for (const m of t.matchAll(re)) {
        if (!covered(term, catalog, generic)) bad.push({ index: m.index, text: original.slice(m.index, m.index + m[0].length) });
      }
      t = t.replace(re, (s) => '\u0000'.repeat(s.length));
    }
  }
  if (bad.length === 0) return passed(RULE);
  bad.sort((a, b) => a.index - b.index);
  const claims = [...new Set(bad.map((b) => quote(b.text)))].join('; ');
  return failed(RULE, `${claims} not in catalog materials [${catalog.join(', ')}]`);
}

module.exports = materialClaimMatchesCatalog;
module.exports.rule = RULE;
