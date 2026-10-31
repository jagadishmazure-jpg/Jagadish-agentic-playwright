'use strict';
// Deterministic offline "copywriter". It does not call any model: it returns the recorded
// description for the test case (vars.case_id) from fixtures/descriptions.json.
// This keeps the eval free, key-less and repeatable; it tests the rules, not a model.
// To grade a real model, replace the provider in promptfooconfig.yaml (see README).
const descriptions = require('./fixtures/descriptions.json');

class FixtureCopywriter {
  constructor(options = {}) {
    this.providerId = options.id || 'fixture-copywriter';
    this.config = options.config || {};
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context) {
    const caseId = context && context.vars && context.vars.case_id;
    if (!caseId || !(caseId in descriptions)) return { error: `no fixture for case_id=${caseId}` };
    return { output: descriptions[caseId], tokenUsage: { total: 0, prompt: 0, completion: 0 }, cost: 0 };
  }
}

module.exports = FixtureCopywriter;
