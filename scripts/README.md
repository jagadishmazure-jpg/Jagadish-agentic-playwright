# Scripts

| File | What it does |
|---|---|
| `gate.py` | Release gate over `evidence/` |
| `render_docs.py` | Renders results docs from evidence; `--check` for CI |
| `measure_flakiness.mjs` | Repeats a test slice with retries off and records per-test pass/fail |
| `record-har.mjs` | Records `tests/fixtures/products.har` |
| `promptfoo_summary.py` | Summarises the promptfoo copy evals into `evidence/promptfoo-evals.json`; `--check` is the CI gate |
| `collect_generated.py` | Turns replay specs from agent runs into `tests/generated/` |
