# ADR 0007: Named-rule evals for generated copy, with an offline provider

## Status

Accepted.

## Context

Product descriptions written by AI must follow brand, catalog and legal rules. When a JavaScript check returns only true or false, a red result does not say which rule broke or which words broke it. Calling a real model in CI would cost money, need a key, and give different results on each run.

## Decision

- Write one promptfoo `javascript` assertion file per rule, declare all of them once under `defaultTest.assert`, and give each one a `metric`.
- Each rule reads product facts from `context.vars` and returns `{ pass, score, reason }`, with the reason `FAILED: <rule> → <exact evidence>`.
- In CI, use a fixture-replay provider. Each fixture case carries `metadata.expect_fail`, and the gate checks that each case fails exactly those rules.
- Keep a bare-boolean copy of the config so the difference is measured, not just claimed.

## Consequences

- Failures can be fixed without reading the brand guide. Each rule's pass rate can be tracked.
- The CI numbers test the rules, not a model. A real-model run is a separate, planned step that will need repeats and a judge for intent.
- The planned failures must be kept in sync with the fixtures. `node --test` and `promptfoo_summary.py --check` both enforce this.
