# Testing non-deterministic AI output

Exact-string assertions break as soon as the wording changes, and AI answers change wording all the time. Loose assertions (`toContain('refund')`) pass for wrong answers. The approach here sits between the two.

## Layers, cheapest first

1. **Structure.** Things that must be exact are exact: the tool sequence, the order id, the amount, the citation ids, the approval state. These come from structured events, not prose.
2. **Forbidden content.** Regexes that must never match: emails, phone numbers, card numbers, links to unknown hosts. Checked on the UI text and on the raw stream.
3. **Meaning.** `framework/utils/semantic.ts` gives a similarity score between the answer and a reference, built from a hashed bag of normalised concepts (offline, deterministic, no model call). `toBeSemanticallyCloseTo` uses a threshold.
4. **Rubrics.** Small judges that return pass/fail with a reason: `eligibleRefund` (mentions approval, the order, no promise of instant money), `ineligibleRefund` (a clear refusal, several phrasings), `noPii`.

## Generated product copy

For text that must follow brand, catalog and legal rules (not just be similar to a reference), see [promptfoo-business-rules.md](promptfoo-business-rules.md): 7 named promptfoo rules that report the broken rule and the exact text.

## Making it trustworthy

- **Seeds.** The fake model takes a seed; `semantic.spec.ts` runs several seeds so the assertion is tested against real variation.
- **Negative controls.** Each judge has a test where a wrong answer must fail. Without that, a judge that always says yes looks perfect.
- **Repeats.** `scripts/measure_flakiness.mjs` runs the slice 20 times with retries off and records per-test pass counts (results in [results.md](results.md)).
- **Mask in visual tests.** `visual.spec.ts` masks the generated text but still compares layout, tool chips and citations.

## With a real model (planned)

Swap the hashed similarity for embeddings and the rubrics for an LLM judge with a fixed prompt and temperature 0, keep the structural and forbidden-content layers unchanged, and track pass rate over N samples rather than a single pass/fail. That has not been run here.
