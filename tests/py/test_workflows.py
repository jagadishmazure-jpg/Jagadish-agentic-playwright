"""Workflow hardening: pinned actions, least-privilege tokens, gated deployment, no risky triggers."""

import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = sorted((ROOT / ".github/workflows").glob("*.yml"))
USES = re.compile(r"^\s*-?\s*uses:\s*(\S+)(.*)$", re.M)


def load(p: Path) -> dict:
    return yaml.safe_load(p.read_text())


def test_expected_workflows_exist():
    assert {p.stem for p in WORKFLOWS} == {"ci", "e2e", "codeql", "infra", "deploy", "teardown"}


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_every_action_is_pinned_to_a_commit_sha_with_a_version_comment(wf):
    for ref, rest in USES.findall(wf.read_text()):
        if ref.startswith("./"):
            continue
        assert re.fullmatch(r"[\w.-]+/[\w./-]+@[0-9a-f]{40}", ref), f"{wf.name}: {ref} is not SHA-pinned"
        assert re.search(r"#\s*v\d", rest), f"{wf.name}: {ref} has no version comment"


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_top_level_token_is_read_only(wf):
    assert load(wf)["permissions"] == {"contents": "read"}


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_no_pull_request_target_and_no_write_all(wf):
    text = wf.read_text()
    assert "pull_request_target" not in text
    assert "write-all" not in text


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_only_the_github_token_secret_is_referenced(wf):
    assert set(re.findall(r"secrets\.(\w+)", wf.read_text())) <= {"GITHUB_TOKEN"}, "Azure auth must be OIDC, no stored secrets"


def test_id_token_is_granted_only_to_azure_jobs():
    for wf in WORKFLOWS:
        for name, job in load(wf)["jobs"].items():
            if "id-token" in (job.get("permissions") or {}):
                assert wf.stem in {"infra", "deploy", "teardown"}, f"{wf.name}:{name}"


def test_every_deploy_and_teardown_job_is_gated():
    for stem in ("deploy", "teardown"):
        for name, job in load(ROOT / f".github/workflows/{stem}.yml")["jobs"].items():
            if name == "preflight":
                continue
            assert "vars.DEPLOY_ENABLED == 'true'" in job["if"], f"{stem}:{name} is not gated"


def test_teardown_requires_typed_confirmation():
    job = load(ROOT / ".github/workflows/teardown.yml")["jobs"]["teardown"]
    assert "inputs.confirm == inputs.environment" in job["if"]


def test_e2e_is_sharded_and_merges_html_and_junit():
    wf = load(ROOT / ".github/workflows/e2e.yml")
    assert wf["jobs"]["e2e"]["strategy"]["matrix"]["shard"] == [1, 2, 3]
    text = (ROOT / ".github/workflows/e2e.yml").read_text()
    assert "merge-reports --reporter=html,junit" in text
    assert "playwright-html-report" in text and "name: junit" in text


def test_codeql_covers_all_three_languages():
    wf = load(ROOT / ".github/workflows/codeql.yml")
    assert wf["jobs"]["analyze"]["strategy"]["matrix"]["language"] == ["javascript-typescript", "python", "actions"]


def test_dependabot_covers_every_ecosystem():
    cfg = load(ROOT / ".github/dependabot.yml")
    assert {u["package-ecosystem"] for u in cfg["updates"]} == {"npm", "pip", "github-actions", "docker", "terraform"}


def test_docker_images_are_digest_pinned():
    for name in ("Dockerfile", "Dockerfile.e2e"):
        for line in (ROOT / name).read_text().splitlines():
            if line.startswith("FROM"):
                assert "@sha256:" in line, f"{name}: {line}"
