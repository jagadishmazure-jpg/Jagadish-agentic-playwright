'use strict';
// The eval wiring: rules declared once, one metric per rule, 50 cases backed by fixtures,
// the offline provider, the bare-boolean comparison, and fixture-vs-rule agreement.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DIR = path.join(__dirname, '..');
const load = (f) => yaml.load(fs.readFileSync(path.join(DIR, f), 'utf8'));
const config = load('promptfooconfig.yaml');
const bareConfig = load('promptfooconfig.bare.yaml');
const cases = load('tests.yaml');
const descriptions = require('../fixtures/descriptions.json');
const catalog = require('../fixtures/catalog.json');
const FixtureCopywriter = require('../provider');

const ruleFiles = fs.readdirSync(path.join(DIR, 'assertions')).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
const RULES = config.defaultTest.assert.map((a) => a.metric);

test('rules are declared once, under defaultTest.assert, one file per rule', () => {
  assert.equal(RULES.length, 7);
  assert.equal(new Set(RULES).size, RULES.length);
  assert.deepEqual([...RULES].sort(), ruleFiles.map((f) => f.replace(/\.js$/, '')).sort());
  for (const a of config.defaultTest.assert) {
    assert.equal(a.type, 'javascript');
    assert.equal(a.value, `file://assertions/${a.metric}.js`);
  }
  assert.ok(cases.every((c) => !c.assert), 'no test case re-declares rules');
});

test('the bare config runs the same rules as booleans with no metrics', () => {
  assert.deepEqual(bareConfig.defaultTest.assert.map((a) => a.value), RULES.map((r) => `file://assertions/bare/${r}.js`));
  assert.ok(bareConfig.defaultTest.assert.every((a) => a.metric === undefined));
  for (const r of RULES) {
    const fn = require(`../assertions/bare/${r}`);
    assert.equal(typeof fn('The X.', { vars: { product_name: 'X', care_note: 'X' } }), 'boolean');
  }
});

test('50 cases, unique ids, each with a fixture, a catalog product and expected failures', () => {
  assert.equal(cases.length, 50);
  const ids = cases.map((c) => c.vars.case_id);
  assert.equal(new Set(ids).size, 50);
  assert.deepEqual(Object.keys(descriptions).sort(), [...ids].sort());
  const skus = new Map(catalog.map((p) => [p.sku, p]));
  for (const c of cases) {
    const p = skus.get(c.vars.sku);
    assert.ok(p, c.vars.sku);
    assert.equal(c.vars.product_name, p.product_name);
    assert.equal(c.vars.materials, p.materials.join(', '));
    assert.equal(c.vars.care_note, p.care_note);
    assert.ok(Array.isArray(c.metadata.expect_fail));
    for (const r of c.metadata.expect_fail) assert.ok(RULES.includes(r), r);
  }
});

test('no var is a YAML list (promptfoo would expand it into extra test cases)', () => {
  for (const c of cases) for (const [k, v] of Object.entries(c.vars)) assert.ok(!Array.isArray(v), `${c.vars.case_id}.${k}`);
});

test('the set has clean cases and deliberate breaks for every rule', () => {
  const broken = cases.flatMap((c) => c.metadata.expect_fail);
  assert.ok(cases.filter((c) => c.metadata.expect_fail.length === 0).length >= 25);
  for (const r of RULES) assert.ok(broken.includes(r), `no case breaks ${r}`);
});

for (const c of cases) {
  test(`${c.vars.case_id} fails exactly ${JSON.stringify(c.metadata.expect_fail)}`, () => {
    const vars = { ...config.defaultTest.vars, ...c.vars };
    const failed = RULES.filter((r) => !require(`../assertions/${r}`)(descriptions[c.vars.case_id], { vars }).pass);
    assert.deepEqual(failed.sort(), [...c.metadata.expect_fail].sort());
  });
}

test('the offline provider replays the fixture and errors on an unknown case', async () => {
  const p = new FixtureCopywriter({ id: 'file://provider.js' });
  assert.equal(p.id(), 'file://provider.js');
  const ok = await p.callApi('prompt', { vars: { case_id: 'c01' } });
  assert.equal(ok.output, descriptions.c01);
  assert.equal(ok.cost, 0);
  assert.match((await p.callApi('prompt', { vars: { case_id: 'nope' } })).error, /no fixture/);
});
