'use strict';
// Compliance rule: the product's care instruction or safety disclaimer (vars.care_note)
// must appear word for word. Case and spacing are ignored; a trailing period is optional.
const { passed, failed, varsOf, text, quote, norm } = require('./_lib');

const RULE = 'required_care_or_disclaimer';

function requiredCareOrDisclaimer(output, context) {
  const required = varsOf(context).care_note;
  if (!required) return failed(RULE, 'test case has no care_note variable');
  const want = norm(required).replace(/\.$/, '');
  const t = text(output);
  if (norm(t).includes(want)) return passed(RULE);
  const sentences = t.trim().split(/(?<=[.!?])\s+/);
  return failed(RULE, `missing ${quote(required)}; last sentence was ${quote(sentences[sentences.length - 1], 70)}`);
}

module.exports = requiredCareOrDisclaimer;
module.exports.rule = RULE;
