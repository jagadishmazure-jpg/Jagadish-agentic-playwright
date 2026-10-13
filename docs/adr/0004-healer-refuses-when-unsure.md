# ADR 0004: The healer refuses when unsure, and never auto-applies

**Decision.** Heal only above a score threshold (0.45) and margin (0.08); otherwise refuse. Healing output is a suggestion for review.
**Why.** A false heal turns a real failure into a pass. The benchmark found one even with these thresholds.
**Trade-off.** More missed heals (4 of 16 broken-locator cases).
