'use strict';
// Catalog rule: the copy uses the exact catalog product name (vars.product_name) at least once,
// so search, SEO and the page title agree. Case-sensitive on purpose.
const { passed, failed, varsOf, text, quote } = require('./_lib');

const RULE = 'names_the_product';

function namesTheProduct(output, context) {
  const name = varsOf(context).product_name;
  if (!name) return failed(RULE, 'test case has no product_name variable');
  const t = text(output);
  if (t.includes(name)) return passed(RULE);
  return failed(RULE, `${quote(name)} not found; copy opens with ${quote(t.trim().split(/\s+/).slice(0, 8).join(' '))}`);
}

module.exports = namesTheProduct;
module.exports.rule = RULE;
