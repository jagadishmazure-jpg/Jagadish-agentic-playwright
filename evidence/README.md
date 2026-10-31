# Evidence

Outputs of real local runs. `scripts/render_docs.py` builds [docs/results.md](../docs/results.md) and the README table from these files, and `scripts/gate.py` fails CI if they break an invariant. Nothing is typed in by hand.

| File | What it does |
|---|---|
| `browser-agent.json` | 50-seed browser-agent benchmark (`handsagent bench`): success, steps, injection blocks, approvals, per run |
| `healing.json` | Offline healer benchmark, 20 cases, written by `tests/healing/heal.spec.ts` |
| `flakiness.json` | Agent-app slice run 20 times with retries off, after the fix |
| `flakiness-before-fix.json` | The same measurement before the shared-state fix (1 flaky test, 6/440 failed) |
| `promptfoo-evals.json` | promptfoo copy evals (`evals/promptfoo`): per-rule pass rates, planted-vs-actual failures, sample reasons, bare-boolean comparison; written by `scripts/promptfoo_summary.py` |
| `sample-runs/` | Audit log (`audit.jsonl`) and generated replay spec for three runs: a return, a purchase and a blocked injection |
