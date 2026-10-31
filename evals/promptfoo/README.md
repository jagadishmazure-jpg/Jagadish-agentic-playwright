# promptfoo business-rule evals

These evals check AI-written product descriptions for the fictional store Larkspur Outfitters against 7 brand, catalog and legal rules. A failing rule reports its name and the exact text that broke it, for example `FAILED: no_unapproved_superlatives → "best wallet you'll ever own"`. Everything runs offline: the provider replays recorded descriptions, so you need no API key and it costs nothing.

Full write-up, real numbers and limitations: [docs/promptfoo-business-rules.md](../../docs/promptfoo-business-rules.md).

```bash
npm ci
npm test        # 96 node --test tests: each rule, plus config and fixture checks
npm run eval    # writes out/results.json (named rules) and out/results-bare.json (bare booleans)
python ../../scripts/promptfoo_summary.py --check
```

You need Node 22.22 or newer (promptfoo 0.125.1 requires it).

| File | What it does |
|---|---|
| `promptfooconfig.yaml` | Named-rule config: the 7 rules declared once under `defaultTest.assert`, each with a `metric` |
| `promptfooconfig.bare.yaml` | The same rules as bare booleans, kept only for comparison |
| `prompt.txt` | The copywriting prompt, filled in from each case's `vars` |
| `provider.js` | Offline provider that returns `fixtures/descriptions.json[case_id]` |
| `tests.yaml` | 50 cases: product facts in `vars`, planned failures in `metadata.expect_fail` |
| `run-evals.mjs` | Runs both configs with telemetry, sharing and update checks off |
| `assertions/` | One file per rule |
| `fixtures/` | Catalog and the 50 recorded descriptions (synthetic) |
| `test/` | `node --test` unit tests |
| `package.json` | Pinned promptfoo 0.125.1 and js-yaml 5.4.3 |
