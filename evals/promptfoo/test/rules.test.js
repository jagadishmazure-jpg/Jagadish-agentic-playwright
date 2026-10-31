'use strict';
// Unit tests for each business rule, called directly the way promptfoo calls them: (output, context).
const test = require('node:test');
const assert = require('node:assert/strict');

const noIntroCliche = require('../assertions/no_intro_cliche');
const noUnapprovedSuperlatives = require('../assertions/no_unapproved_superlatives');
const materialClaim = require('../assertions/material_claim_matches_catalog');
const requiredCare = require('../assertions/required_care_or_disclaimer');
const lengthWithinLimits = require('../assertions/length_within_limits');
const brandVoice = require('../assertions/brand_voice');
const namesTheProduct = require('../assertions/names_the_product');

const ctx = (vars) => ({ vars });
const WALLET = { product_name: 'Harbor Bifold Wallet', materials: 'top-grain leather, cotton', care_note: 'Spot clean only.', min_words: 5, max_words: 80 };

test('the lesson example fails with rule names and the exact text', () => {
  const copy = "Introducing the Harbor Bifold Wallet, the best wallet you'll ever own. Full-grain leather inside and out. Spot clean only.";
  assert.equal(noIntroCliche(copy, ctx(WALLET)).reason, 'FAILED: no_intro_cliche \u2192 "Introducing the Harbor Bifold Wallet"');
  assert.equal(noUnapprovedSuperlatives(copy, ctx(WALLET)).reason, 'FAILED: no_unapproved_superlatives \u2192 "best wallet you\'ll ever own"');
  assert.equal(
    materialClaim(copy, ctx(WALLET)).reason,
    'FAILED: material_claim_matches_catalog \u2192 "Full-grain leather" not in catalog materials [top-grain leather, cotton]',
  );
});

test('every rule returns { pass, score, reason } with score 1 or 0', () => {
  const copy = 'The Harbor Bifold Wallet is top-grain leather with a cotton lining. Spot clean only.';
  for (const rule of [noIntroCliche, noUnapprovedSuperlatives, materialClaim, requiredCare, lengthWithinLimits, brandVoice, namesTheProduct]) {
    const r = rule(copy, ctx(WALLET));
    assert.deepEqual(Object.keys(r).sort(), ['pass', 'reason', 'score']);
    assert.equal(r.pass, true, r.reason);
    assert.equal(r.score, 1);
    assert.equal(r.reason, `PASSED: ${rule.rule}`);
  }
});

test('every rule exports its metric name', () => {
  const names = [noIntroCliche, noUnapprovedSuperlatives, materialClaim, requiredCare, lengthWithinLimits, brandVoice, namesTheProduct].map((r) => r.rule);
  assert.deepEqual(names, [
    'no_intro_cliche', 'no_unapproved_superlatives', 'material_claim_matches_catalog', 'required_care_or_disclaimer',
    'length_within_limits', 'brand_voice', 'names_the_product',
  ]);
});

test('rules survive a missing context and non-string output', () => {
  for (const rule of [noIntroCliche, noUnapprovedSuperlatives, materialClaim, lengthWithinLimits, brandVoice]) {
    assert.doesNotThrow(() => rule(undefined, undefined));
    assert.doesNotThrow(() => rule(42, {}));
  }
  assert.match(requiredCare('x', {}).reason, /no care_note variable/);
  assert.match(namesTheProduct('x', {}).reason, /no product_name variable/);
});

// no_intro_cliche
for (const opener of ['Introducing the X.', 'Meet the X.', 'Say hello to X.', 'Look no further: X.', 'Discover the X.', 'Presenting X.', 'Are you looking for X?', 'Imagine a jacket.', "Whether you're hiking or not, X.", "In today's world, X."]) {
  test(`no_intro_cliche fails the opener ${JSON.stringify(opener.split(' ')[0])}`, () => {
    const r = noIntroCliche(opener);
    assert.equal(r.pass, false);
    assert.match(r.reason, /^FAILED: no_intro_cliche \u2192 "/);
  });
}

test('no_intro_cliche catches clichés later in the copy too', () => {
  assert.equal(noIntroCliche('The X is a game-changer on wet trails.').reason, 'FAILED: no_intro_cliche \u2192 "game-changer"');
  assert.equal(noIntroCliche('The X is light. Look no further.').reason, 'FAILED: no_intro_cliche \u2192 "Look no further"');
});

test('no_intro_cliche passes a plain opening and ignores the words mid-sentence', () => {
  assert.equal(noIntroCliche('The X keeps rain out. We are introducing new colors next spring.').pass, true);
});

// no_unapproved_superlatives
for (const [copy, evidence] of [
  ['The best pack you will ever carry.', 'best pack you will ever carry'],
  ['It is the world\u2019s lightest shell.', 'world\u2019s lightest'],
  ['Our #1 seller.', '#1'],
  ['Unbeatable grip on rock.', 'Unbeatable'],
  ['It is 100% waterproof.', '100% waterproof'],
  ['A strap that never wears out.', 'never wears out'],
  ['Comes with a lifetime warranty.', 'lifetime warranty'],
  ['Perfect for everyone.', 'Perfect for everyone'],
  ['The warmest hat we sell.', 'The warmest'],
]) {
  test(`no_unapproved_superlatives flags ${JSON.stringify(evidence)}`, () => {
    assert.equal(noUnapprovedSuperlatives(copy, ctx({})).reason, `FAILED: no_unapproved_superlatives \u2192 "${evidence}"`);
  });
}

test('no_unapproved_superlatives allows a claim legal approved for this product only', () => {
  const copy = 'Taped seams make it fully waterproof.';
  assert.equal(noUnapprovedSuperlatives(copy, ctx({ approved_claims: 'fully waterproof' })).pass, true);
  assert.equal(noUnapprovedSuperlatives(copy, ctx({ approved_claims: ['fully waterproof'] })).pass, true);
  assert.equal(noUnapprovedSuperlatives(copy, ctx({})).pass, false);
  assert.equal(noUnapprovedSuperlatives(copy, ctx({ approved_claims: 'lifetime warranty' })).pass, false);
});

test('no_unapproved_superlatives reports every hit once, in order, keeping the longer span', () => {
  const r = noUnapprovedSuperlatives("Unbeatable. The best boot you'll ever own, with a lifetime guarantee.", ctx({}));
  assert.equal(r.reason, 'FAILED: no_unapproved_superlatives \u2192 "Unbeatable"; "best boot you\'ll ever own"; "lifetime guarantee"');
});

// material_claim_matches_catalog
test('material rule reads the catalog from vars, not from code', () => {
  const copy = 'Made from full-grain leather.';
  assert.equal(materialClaim(copy, ctx({ materials: 'full-grain leather' })).pass, true);
  assert.equal(materialClaim(copy, ctx({ materials: 'top-grain leather' })).pass, false);
});

test('material rule: a specific grade must match exactly; generic words are covered', () => {
  const boot = ctx({ materials: 'full-grain leather, rubber' });
  assert.equal(materialClaim('The leather upper and rubber sole.', boot).pass, true);
  assert.equal(materialClaim('Genuine leather upper.', boot).reason, 'FAILED: material_claim_matches_catalog \u2192 "Genuine leather" not in catalog materials [full-grain leather, rubber]');
  assert.equal(materialClaim('Full grain leather, spelled without a hyphen.', boot).pass, true);
});

test('material rule: "leather" is not covered by vegan leather', () => {
  const tote = ctx({ materials: 'organic cotton canvas, vegan leather' });
  assert.equal(materialClaim('Vegan leather straps and organic cotton canvas.', tote).pass, true);
  assert.equal(materialClaim('Leather straps.', tote).pass, false);
  assert.equal(materialClaim('A canvas body and cotton lining.', tote).pass, true);
});

test('material rule lists every unlisted material once', () => {
  const r = materialClaim('Merino wool with cashmere, and more cashmere.', ctx({ materials: 'recycled polyester fleece' }));
  assert.equal(r.reason, 'FAILED: material_claim_matches_catalog \u2192 "Merino wool"; "cashmere" not in catalog materials [recycled polyester fleece]');
});

test('material rule passes copy that names no material at all', () => {
  assert.equal(materialClaim('Two doors and two vestibules.', ctx({ materials: 'ripstop nylon' })).pass, true);
});

// required_care_or_disclaimer
test('care rule passes the exact note, ignoring case, spacing and the final period', () => {
  const v = ctx({ care_note: 'Hand wash cold and lay flat to dry.' });
  assert.equal(requiredCare('Soft knit. hand  wash cold and lay flat to dry', v).pass, true);
});

test('care rule fails a paraphrase and quotes the last sentence', () => {
  const r = requiredCare('Soft knit. Wash by hand in cold water.', ctx({ care_note: 'Hand wash cold and lay flat to dry.' }));
  assert.equal(r.reason, 'FAILED: required_care_or_disclaimer \u2192 missing "Hand wash cold and lay flat to dry."; last sentence was "Wash by hand in cold water."');
});

// length_within_limits
test('length rule uses per-case limits and names the overflow text', () => {
  const copy = Array.from({ length: 12 }, (_, i) => `w${i + 1}`).join(' ');
  assert.equal(lengthWithinLimits(copy, ctx({ min_words: 5, max_words: 12 })).pass, true);
  assert.equal(lengthWithinLimits(copy, ctx({ min_words: 5, max_words: 10 })).reason, 'FAILED: length_within_limits \u2192 12 words > max 10; overflow starts at "w11 w12"');
  assert.equal(lengthWithinLimits(copy, ctx({ min_words: 20 })).reason, `FAILED: length_within_limits \u2192 12 words < min 20: "${copy}"`);
});

test('length rule falls back to 35..110 words', () => {
  assert.equal(lengthWithinLimits('one two three', ctx({})).pass, false);
  assert.equal(lengthWithinLimits(Array(35).fill('w').join(' '), ctx({})).pass, true);
  assert.equal(lengthWithinLimits(Array(111).fill('w').join(' '), ctx({})).pass, false);
});

// brand_voice
test('brand voice flags exclamation marks with the words before them', () => {
  assert.equal(brandVoice('Light and warm. Your new favorite hat!', ctx({})).reason, 'FAILED: brand_voice \u2192 "Your new favorite hat!"');
});

test('brand voice flags shouting but allows approved acronyms', () => {
  assert.equal(brandVoice('AMAZING for camp.', ctx({})).reason, 'FAILED: brand_voice \u2192 "AMAZING"');
  assert.equal(brandVoice('BPA-free with a DWR finish and UPF 50.', ctx({})).pass, true);
  assert.equal(brandVoice('Built with ECO yarn.', ctx({ allowed_caps: 'ECO' })).pass, true);
});

test('brand voice flags sales pressure', () => {
  for (const p of ['Buy now.', 'Order yours today.', 'Hurry.', "Don't miss out.", 'Limited time.', 'While stocks last.']) {
    assert.equal(brandVoice(`A good hat. ${p}`, ctx({})).pass, false, p);
  }
  assert.equal(brandVoice('Sizes run true; order your usual size.', ctx({})).pass, true);
});

// names_the_product
test('product name must appear exactly, case included', () => {
  const v = ctx({ product_name: 'Tarn Merino Beanie' });
  assert.equal(namesTheProduct('The Tarn Merino Beanie is warm.', v).pass, true);
  assert.equal(namesTheProduct('The Tarn merino beanie is warm.', v).reason, 'FAILED: names_the_product \u2192 "Tarn Merino Beanie" not found; copy opens with "The Tarn merino beanie is warm."');
});
