# Rules

Each file exports `(output, context) => { pass, score, reason }`. A rule reads product facts only from `context.vars`, and its metric name is the file name. When it fails, the reason is `FAILED: <rule> → <exact evidence>`.

| File | What it does |
|---|---|
| `_lib.js` | Shared helpers: `passed`, `failed`, `quote`, `asList`, `norm` |
| `no_intro_cliche.js` | No stock openers or "game-changer" |
| `no_unapproved_superlatives.js` | No superlative or absolute claim unless it is in `vars.approved_claims` |
| `material_claim_matches_catalog.js` | Materials named must match `vars.materials` (the grade must match exactly) |
| `required_care_or_disclaimer.js` | `vars.care_note` appears word for word |
| `length_within_limits.js` | Word count is between `vars.min_words` and `vars.max_words` |
| `brand_voice.js` | No exclamation marks, no shouting in capitals, no sales pressure |
| `names_the_product.js` | The exact `vars.product_name` appears |
| `bare/` | The same rules returning bare booleans, used only for the comparison |
