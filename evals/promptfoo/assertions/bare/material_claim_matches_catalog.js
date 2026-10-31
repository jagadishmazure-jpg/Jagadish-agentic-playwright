'use strict';
// The bare-boolean trap, kept for comparison only: same check, but it returns true/false,
// so a failure in promptfoo carries no rule name and no evidence.
const rule = require('../material_claim_matches_catalog');

module.exports = (output, context) => rule(output, context).pass;
