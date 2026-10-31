'use strict';
// Layout rule: the product page slot fits vars.min_words..vars.max_words words
// (defaults come from defaultTest.vars in promptfooconfig.yaml).
const { passed, failed, varsOf, quote, words } = require('./_lib');

const RULE = 'length_within_limits';

function lengthWithinLimits(output, context) {
  const v = varsOf(context);
  const min = Number(v.min_words ?? 35);
  const max = Number(v.max_words ?? 110);
  const w = words(output);
  if (w.length >= min && w.length <= max) return passed(RULE);
  if (w.length > max) return failed(RULE, `${w.length} words > max ${max}; overflow starts at ${quote(w.slice(max, max + 8).join(' '))}`);
  return failed(RULE, `${w.length} words < min ${min}: ${quote(w.join(' '))}`);
}

module.exports = lengthWithinLimits;
module.exports.rule = RULE;
