# Threat model

Scope: the Larkspur demo app and assistant (system under test), the browser agent, the test suite and its CI, and the gated Azure stack. Data is synthetic throughout. Nothing has been deployed, so cloud rows describe the design.

## Assets

Customer data (synthetic names, `example.com` emails, `555-01xx` phones), payment details (test card only), refund approvals, test credentials and storage state, CI tokens, the Azure subscription, and the integrity of test results themselves (a test that falsely passes is a security problem in QA).

## Trust boundaries

1. Browser ↔ app (HTTP). 2. Assistant ↔ content it reads (reviews, policies). 3. Agent model ↔ guard ↔ Playwright MCP. 4. Agent browser ↔ the web. 5. GitHub Actions ↔ Azure (OIDC). 6. Contributors ↔ main branch.

## STRIDE

| | Threat | Where | Control | Evidence |
|---|---|---|---|---|
| **S**poofing | Customer approves own refund | Approval API | Only the specialist role can approve; anyone can deny | `approval.spec.ts` › customer cannot approve |
| S | CI impersonates a deployer | Actions → Azure | OIDC federated credential bound to environment; no client secret | `test_workflows.py` (only `GITHUB_TOKEN` referenced) |
| **T**ampering | Poisoned policy document changes answers | Assistant retrieval | Injection screen drops it, citations exclude it | `injection.spec.ts`, `tools-citations.spec.ts` |
| T | Workflow edited to exfiltrate | `.github/` | SHA-pinned actions, CODEOWNERS, rulesets, CodeQL `actions` | `test_workflows.py` |
| **R**epudiation | "The agent did it" | Browser agent | `audit.jsonl` per step with rule and reason; traces | `evidence/sample-runs/` |
| **I**nformation disclosure | PII in answers or streams | Assistant | Output masking on every token path | `pii.spec.ts`, `assistant.api.spec.ts` |
| I | Secrets in traces, storage state, logs | Test suite | `.auth/` and storage state git-ignored; agent secrets redacted; gitleaks on full history; `test_repo_hygiene.py` | CI `secrets` job |
| I | Card number typed by an injected agent | Browser agent | `fill_secret` field matching, `secret_in_text` | benchmark: secrets seen by model = 0 |
| **D**enial of service | Long prompts, runaway agent | Assistant, agent | Input length bound (422), step budget | `assistant.api.spec.ts`, benchmark |
| **E**levation of privilege | Customer calls staff product API | Products API | Role check: 401 anonymous, 403 customer | `products.api.spec.ts` › authorisation |
| E | Agent gains arbitrary script execution | MCP | `browser_evaluate` and co. never exposed, deny list | `test_browser_guard.py` |

## OWASP Top 10 for LLM applications (2025)

| ID | Risk | Control here |
|---|---|---|
| LLM01 | Prompt injection (direct and indirect) | Content screening, instruction hierarchy, approval gate, browser guard; tested with planted reviews and policies |
| LLM02 | Sensitive information disclosure | PII masking on UI and stream; secrets never in model context |
| LLM03 | Supply chain | Pinned versions, lockfiles, Dependabot, SBOM, digest-pinned images, CodeQL |
| LLM04 | Data and model poisoning | Tampered policy (`POL-VND-09`) excluded; citations validated against known ids |
| LLM05 | Improper output handling | Model tokens are inserted with `textContent`, user text is escaped, masking happens before render; `nosniff` and `frame-ancestors` headers |
| LLM06 | Excessive agency | Small tool set, deny list, approval for refunds and irreversible clicks, step budget |
| LLM07 | System prompt leakage | No secrets in prompts; nothing in the prompt is security-relevant |
| LLM08 | Vector and embedding weaknesses | Not applicable (keyword policy search, no vector store); noted as a gap if one is added |
| LLM09 | Misinformation | Answers must cite policy ids; unknown orders reported, not invented; semantic judges |
| LLM10 | Unbounded consumption | Input length bound, step budget, scale-to-zero hosting |

## OWASP Top 10 (web, 2021)

| ID | Risk | Control |
|---|---|---|
| A01 Broken access control | Orders scoped to caller; role checks on staff APIs and approvals | `products.api.spec.ts`, `approval.spec.ts` |
| A02 Cryptographic failures | TLS at the Container Apps ingress (design); no real secrets stored |
| A03 Injection | Pydantic validation, no SQL, text rendering; prompt injection as above |
| A04 Insecure design | Human approval designed in for money movement |
| A05 Security misconfiguration | Security headers on every response; test endpoints only with `LARKSPUR_TEST_MODE` (on in this demo, documented) |
| A06 Vulnerable components | Dependabot alerts and security updates, SBOM |
| A07 Identification and authentication failures | Password + one-time code; wrong-code tests |
| A08 Software and data integrity failures | SHA-pinned actions, digest-pinned images, rulesets |
| A09 Logging and monitoring failures | Agent audit log; Log Analytics in the Azure design |
| A10 SSRF | The app makes no outbound requests; the agent's origin allowlist |

## Residual risks

- Test-only endpoints (one-time code lookup, reset) are enabled in the hosted design because the app exists to be tested. Never copy that setting to a real app.
- The injection screen is pattern-based; a real LLM may be fooled by phrasings it misses. The approval gate is the backstop.
- The guard has only been exercised by a scripted model.
