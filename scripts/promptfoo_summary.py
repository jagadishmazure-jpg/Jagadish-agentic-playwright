"""Summarise the promptfoo business-rule evals into evidence/promptfoo-evals.json.

  python scripts/promptfoo_summary.py          read evals/promptfoo/out/*.json, write the evidence file
  python scripts/promptfoo_summary.py --check  exit 1 if the fresh run differs from the committed evidence,
                                               if any case failed a different set of rules than it was
                                               written to break, or if a failure reason is not
                                               'FAILED: <rule> → <evidence>'
Run `npm run eval` and `npm run eval:bare` in evals/promptfoo first. Only stable fields are kept
(no timestamps, ids or durations), so the evidence is identical on every machine.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "evals/promptfoo/out"
EVIDENCE = ROOT / "evidence/promptfoo-evals.json"
SAMPLE_CASES = ("c34", "c04", "c19", "c25", "c29")


def rows(name: str) -> list[dict]:
    data = json.loads((OUT / name).read_text())["results"]
    return sorted(data["results"], key=lambda r: r["vars"]["case_id"])


def summarise() -> dict:
    named, bare = rows("results.json"), rows("results-bare.json")
    rules: list[str] = []
    per_rule: dict[str, Counter] = {}
    mismatches, bad_format, samples = [], [], {}
    for r in named:
        cid = r["vars"]["case_id"]
        failed = []
        for c in r["gradingResult"]["componentResults"]:
            rule = c["assertion"]["metric"]
            if rule not in rules:
                rules.append(rule)
            per_rule.setdefault(rule, Counter())["pass" if c["pass"] else "fail"] += 1
            if not c["pass"]:
                failed.append(rule)
                if not re.fullmatch(rf"FAILED: {re.escape(rule)} \u2192 .+", c["reason"], flags=re.S):
                    bad_format.append(f"{cid}:{rule}")
        expected = sorted(r["testCase"].get("metadata", {}).get("expect_fail", []))
        if sorted(failed) != expected:
            mismatches.append({"case": cid, "failed": sorted(failed), "expected": expected})
        if cid in SAMPLE_CASES:
            samples[cid] = [c["reason"] for c in r["gradingResult"]["componentResults"] if not c["pass"]]
    total_fail = sum(c["fail"] for c in per_rule.values())
    bare_fail = [c for r in bare for c in r["gradingResult"]["componentResults"] if not c["pass"]]
    return {
        "provider": "fixture-copywriter (offline replay of fixtures/descriptions.json; no model call)",
        "promptfoo_version": json.loads((ROOT / "evals/promptfoo/package.json").read_text())["devDependencies"]["promptfoo"],
        "cases": len(named),
        "cases_passed": sum(r["success"] for r in named),
        "cases_failed": sum(not r["success"] for r in named),
        "errors": sum(bool(r.get("error")) and not r.get("gradingResult") for r in named),
        "rules": len(rules),
        "assertions": len(rules) * len(named),
        "assertions_failed": total_fail,
        "per_rule": {k: {"passed": per_rule[k]["pass"], "failed": per_rule[k]["fail"], "pass_rate": round(per_rule[k]["pass"] / len(named), 2)} for k in rules},
        "cases_matching_expected_failures": len(named) - len(mismatches),
        "expectation_mismatches": mismatches,
        "failure_reasons_in_named_format": total_fail - len(bad_format),
        "bad_format": bad_format,
        "sample_failure_reasons": samples,
        "bare": {
            "cases_failed": sum(not r["success"] for r in bare),
            "assertions_failed": len(bare_fail),
            "failure_reasons_with_evidence": sum("\u2192" in c["reason"] for c in bare_fail),
            "failure_reasons_starting_custom_function_returned_false": sum(c["reason"].startswith("Custom function returned false") for c in bare_fail),
            "per_rule_metrics_reported": len({k for r in bare for k in (r["gradingResult"].get("namedScores") or {})}),
            "sample_reason": bare_fail[0]["reason"] if bare_fail else "",
        },
    }


def main() -> int:
    fresh = summarise()
    problems = []
    if fresh["expectation_mismatches"]:
        problems.append(f"{len(fresh['expectation_mismatches'])} case(s) failed different rules than expected")
    if fresh["bad_format"]:
        problems.append(f"{len(fresh['bad_format'])} failure reason(s) not in 'FAILED: <rule> → <evidence>' form")
    if "--check" in sys.argv:
        committed = json.loads(EVIDENCE.read_text()) if EVIDENCE.exists() else None
        if committed != fresh:
            problems.append("evidence/promptfoo-evals.json drifts from this run - rerun the evals and this script")
    else:
        EVIDENCE.write_text(json.dumps(fresh, indent=2, ensure_ascii=False) + "\n")
    for name, r in fresh["per_rule"].items():
        print(f"{name:32} {r['passed']}/{fresh['cases']} pass ({r['pass_rate']:.0%})")
    print(f"cases {fresh['cases_passed']}/{fresh['cases']} clean; {fresh['cases_matching_expected_failures']}/{fresh['cases']} failed exactly the rules they were written to break")
    for p in problems:
        print("PROBLEM:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
