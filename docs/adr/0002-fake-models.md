# ADR 0002: Seeded fake models instead of a real LLM

**Decision.** The assistant uses `FakeModel` and the browser agent uses `ScriptedBrowserModel`, both seeded and offline.
**Why.** Reproducible tests, zero cost, no cloud (a hard constraint for this repo), and the ability to make the model misbehave on purpose (gullible mode, obey rate) so guardrails are exercised.
**Trade-off.** Success rates say nothing about real model quality; this is stated next to every number.
