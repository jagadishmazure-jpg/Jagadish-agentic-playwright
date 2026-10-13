# ADR 0005: Visual comparisons only inside the pinned Playwright image

**Decision.** `visual` is an opt-in project, run with `Dockerfile.e2e` (official image pinned by digest); snapshot paths have no platform suffix.
**Why.** Font rendering differs across machines; one environment means one set of baselines.
**Trade-off.** Visual checks need Docker locally.
