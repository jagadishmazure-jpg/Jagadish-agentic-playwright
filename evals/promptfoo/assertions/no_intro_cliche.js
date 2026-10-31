'use strict';
// Brand rule: open with the product and what it does, not a stock opener.
const { passed, failed, text, quote } = require('./_lib');

const RULE = 'no_intro_cliche';
const OPENERS = /^(introducing|meet (?:the|your)|say hello to|look no further|discover the|presenting|are you (?:looking|tired)|imagine|whether you're|in today's)\b/i;
const ANYWHERE = /\b(look no further|game[- ]changer|elevate your (?:adventure|style|game|outdoor))/i;

function noIntroCliche(output) {
  const t = text(output).trim();
  const open = t.match(OPENERS);
  if (open) {
    const firstClause = t.split(/[.!?,:;\u2014]/)[0];
    return failed(RULE, quote(firstClause, 60));
  }
  const any = t.match(ANYWHERE);
  if (any) return failed(RULE, quote(any[0]));
  return passed(RULE);
}

module.exports = noIntroCliche;
module.exports.rule = RULE;
