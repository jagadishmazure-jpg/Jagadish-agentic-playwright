"""promptfoo business-rule evals (evals/promptfoo): wiring, evidence and, when Node is set up, a live offline run."""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[2]
EVALS = ROOT / "evals/promptfoo"
CONFIG = yaml.safe_load((EVALS / "promptfooconfig.yaml").read_text())
BARE = yaml.safe_load((EVALS / "promptfooconfig.bare.yaml").read_text())
CASES = yaml.safe_load((EVALS / "tests.yaml").read_text())
EVIDENCE = json.loads((ROOT / "evidence/promptfoo-evals.json").read_text())
RULES = [a["metric"] for a in CONFIG["defaultTest"]["assert"]]
PROMPTFOO = EVALS / "node_modules/.bin/promptfoo"


def node_major() -> int:
    node = shutil.which("node")
    if not node:
        return 0
    out = subprocess.run([node, "--version"], capture_output=True, text=True).stdout
    return int(out.lstrip("v").split(".")[0] or 0)


def test_rules_are_declared_once_with_a_metric_each():
    assert len(RULES) == 7 and len(set(RULES)) == 7
    for a in CONFIG["defaultTest"]["assert"]:
        assert a["type"] == "javascript"
        assert a["value"] == f"file://assertions/{a['metric']}.js"
        assert (EVALS / "assertions" / f"{a['metric']}.js").exists()
    assert CONFIG["tests"] == "file://tests.yaml"
    assert not any("assert" in c for c in CASES)


def test_provider_is_the_offline_fixture_replay():
    providers = CONFIG["providers"] + BARE["providers"]
    assert [p["id"] for p in providers] == ["file://provider.js"] * 2
    src = (EVALS / "provider.js").read_text()
    assert "fixtures/descriptions.json" in src
    assert not re.search(r"\b(fetch|https?://|require\('https?'\)|API_KEY)\b", src)


def test_bare_config_is_the_same_rules_without_metrics():
    assert [a["value"] for a in BARE["defaultTest"]["assert"]] == [f"file://assertions/bare/{r}.js" for r in RULES]
    assert all("metric" not in a for a in BARE["defaultTest"]["assert"])


def test_fifty_cases_with_fixtures():
    ids = [c["vars"]["case_id"] for c in CASES]
    fixtures = json.loads((EVALS / "fixtures/descriptions.json").read_text())
    assert len(ids) == 50 == len(set(ids)) == len(fixtures)
    assert set(ids) == set(fixtures)


def test_evidence_shows_every_case_failed_exactly_its_planted_rules():
    assert EVIDENCE["cases"] == 50 and EVIDENCE["errors"] == 0
    assert EVIDENCE["cases_matching_expected_failures"] == 50
    assert EVIDENCE["expectation_mismatches"] == [] and EVIDENCE["bad_format"] == []


def test_evidence_per_rule_counts_match_the_planted_breaks():
    planted = {r: sum(r in c["metadata"]["expect_fail"] for c in CASES) for r in RULES}
    assert {r: v["failed"] for r, v in EVIDENCE["per_rule"].items()} == planted
    assert EVIDENCE["assertions_failed"] == sum(planted.values()) == EVIDENCE["failure_reasons_in_named_format"]
    assert EVIDENCE["cases_passed"] == sum(not c["metadata"]["expect_fail"] for c in CASES)


def test_evidence_sample_reasons_name_the_rule_and_quote_the_text():
    for reasons in EVIDENCE["sample_failure_reasons"].values():
        for reason in reasons:
            assert re.match(r"FAILED: [a-z_]+ \u2192 .+", reason)
    assert 'FAILED: no_unapproved_superlatives \u2192 "best wallet you\'ll ever own"' in EVIDENCE["sample_failure_reasons"]["c34"]


def test_evidence_shows_the_bare_boolean_trap():
    bare = EVIDENCE["bare"]
    assert bare["cases_failed"] == EVIDENCE["cases_failed"]
    assert bare["assertions_failed"] == EVIDENCE["assertions_failed"]
    assert bare["failure_reasons_with_evidence"] == 0
    assert bare["failure_reasons_starting_custom_function_returned_false"] == bare["assertions_failed"]
    assert bare["per_rule_metrics_reported"] == 0


def test_ci_runs_the_evals_offline_and_checks_the_evidence():
    job = yaml.safe_load((ROOT / ".github/workflows/ci.yml").read_text())["jobs"]["promptfoo"]
    runs = "\n".join(s.get("run", "") for s in job["steps"])
    assert "npm ci" in runs and "npm test" in runs and "npm run eval" in runs
    assert "promptfoo_summary.py --check" in runs
    assert not set(re.findall(r"secrets\.(\w+)", str(job)))


@pytest.mark.skipif(not PROMPTFOO.exists() or node_major() < 22, reason="needs Node 22+ and `npm ci` in evals/promptfoo")
def test_live_offline_eval_reproduces_the_committed_evidence():
    env = {k: v for k, v in os.environ.items() if not k.endswith("_API_KEY")}  # prove no key is needed
    r = subprocess.run(["npm", "run", "eval"], cwd=EVALS, env=env, capture_output=True, text=True, timeout=300)
    assert r.returncode == 0, r.stdout[-2000:] + r.stderr[-2000:]
    s = subprocess.run([sys.executable, "scripts/promptfoo_summary.py", "--check"], cwd=ROOT, capture_output=True, text=True)
    assert s.returncode == 0, s.stdout
