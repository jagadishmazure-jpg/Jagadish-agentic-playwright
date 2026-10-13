# Limitations

Honest boundaries of what was built and measured.

| Area | Limitation |
|---|---|
| Models | Both the assistant (`FakeModel`) and the browser agent (`ScriptedBrowserModel`) are seeded, offline stand-ins. No real LLM was called. Benchmark success rates measure the harness, not model quality. |
| Test agents | Playwright planner/generator/healer definitions are installed but were not run (they need an interactive LLM loop). |
| Healer | Rule-based and offline; 20 cases on one app. Its false heal shows it is not safe to auto-apply. |
| Azure | IaC passes `terraform test`, `tflint`, `checkov` and `bicep build`, but nothing was applied and no cloud browser was used. Role names and API shapes follow the docs at the time of writing and could change. |
| Injection screen | Pattern-based. It catches the planted examples; a real attacker would vary them. Approval gates are the backstop. |
| Visual tests | Baselines are valid only inside the pinned Docker image. |
| Environment | All numbers come from one Linux box (Playwright 1.64.0, Node 20/22, Python 3.12) and GitHub-hosted runners. |
| Data | Synthetic; the app is a demo, not a reference for building a shop. Test endpoints are on by design. |
