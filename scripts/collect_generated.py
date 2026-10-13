"""Turn the browser agent's replay files into Playwright tests (tests/generated/).

Playwright MCP reports the Playwright code for every action it performs. During the benchmark the
agent's allowed actions were recorded into out/browser-agent/seed-*/replay.spec.ts. This script keeps
the successful runs, removes screenshot calls, makes URLs relative, swaps the redacted card for the
public test card from the framework config, de-duplicates identical action sequences, and adds the
one assertion the agent itself verified (its DONE message). MCP code has no assertions of its own,
which is exactly the weakness the generated-suite pass rate is meant to expose.

    python scripts/collect_generated.py out/browser-agent evidence/browser-agent.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests" / "generated"


def body(replay: str, base: str) -> list[str]:
    text = replay.split("async ({ page }) => {", 1)[1].rsplit("});", 1)[0]
    text = re.sub(r"\s*// Screenshot.*?\n\s*await page\.screenshot\(\{.*?\}\);", "", text, flags=re.S)
    text = text.replace(base, "")
    text = text.replace("'[secret:card]'", "testCard")
    return [ln.strip() for ln in text.strip().splitlines() if ln.strip()]


def main(runs_dir: str, summary: str) -> int:
    runs = json.loads(Path(summary).read_text())["per_run"]
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.spec.ts"):
        old.unlink()
    seen: dict[tuple[str, ...], int] = {}
    for r in runs:
        if r["outcome"] != "done":
            continue
        lines = tuple(body((Path(runs_dir) / f"seed-{r['seed']:03d}" / "replay.spec.ts").read_text(), r["task"]["base"]))
        if lines in seen:
            continue
        seen[lines] = r["seed"]
        if r["task"]["goal"] == "return":
            check = f"await expect(page.getByRole('status')).toHaveText(/Return RMA-\\d{{4}} created for {r['task']['order']}/);"
        else:
            check = "await expect(page.locator('#result')).toHaveText(/Order placed: LK-\\d{4}/);"
        spec = (
            "// GENERATED from a recorded browser-agent run (Playwright MCP codegen) by scripts/collect_generated.py.\n"
            f"// Source: benchmark seed {r['seed']}, task {r['task']['goal']}. Only the final assertion was added.\n"
            "import { expect, test } from '@playwright/test';\n"
            + ("import { testCard } from '../../framework/config/env';\n" if "testCard" in "".join(lines) else "")
            + f"\ntest('generated: seed {r['seed']} {r['task']['goal']}', async ({{ page }}) => {{\n"
            + "".join(f"  {ln}\n" for ln in lines)
            + f"  {check}\n}});\n"
        )
        (OUT / f"seed-{r['seed']:03d}.spec.ts").write_text(spec)
    print(f"successful runs: {sum(r['outcome'] == 'done' for r in runs)}, unique action sequences written: {len(seen)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:3]))
