# Agent-app specs

Role 2.

| File | What it does |
|---|---|
| `a11y.spec.ts` | Assistant page and approval dialog pass axe |
| `approval.spec.ts` | Approval dialog, specialist approves in a second context, no self-approval, ineligible orders |
| `injection.spec.ts` | Poisoned review, tampered policy, user-typed instructions |
| `pii.spec.ts` | Masked contact details across seeds, no echo of typed PII |
| `semantic.spec.ts` | Meaning holds across wordings, refusal judged as refusal, negative control |
| `streaming.spec.ts` | First token before completion, latency budgets, send disabled while streaming |
| `tools-citations.spec.ts` | Tool order, rendered results, real citations only, unknown orders |
