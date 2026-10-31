"""Repository hygiene: docs exist and link, no copied sources, no deployment claims, fictional orgs, no secrets."""

import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SKIP = {
    ".git",
    "node_modules",
    ".venv",
    ".pytest_cache",
    ".ruff_cache",
    "__pycache__",
    ".terraform",
    "test-results",
    "playwright-report",
    "blob-report",
    ".auth",
    "out",
    "refs",
    "__screenshots__",
    "sample-runs",
}
TRACKED = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout.split()
MD = sorted(ROOT / f for f in TRACKED if f.endswith(".md"))
DOCS = [
    "architecture", "role-1-qa-framework", "role-2-ai-app-qa", "role-3-browser-agent", "test-agents", "interview-coverage",
    "flaky-test-playbook", "testing-ai-output", "browser-agent-safety", "threat-model", "azure", "ci", "limitations",
    "interview-talking-points", "adopt-this", "glossary", "results", "promptfoo-business-rules",
]  # fmt: skip


def flat(p: Path) -> str:
    return " ".join(p.read_text().split())


def folders():
    dirs = {(ROOT / f).parent for f in TRACKED}
    return sorted(d for d in dirs if not SKIP & set(d.relative_to(ROOT).parts) and d != ROOT / ".github")


@pytest.mark.parametrize("folder", folders(), ids=lambda p: str(p.relative_to(ROOT)) or ".")
def test_every_folder_has_a_readme(folder):
    assert (folder / "README.md").exists(), f"{folder.relative_to(ROOT)} has no README.md"


def test_doc_set_exists():
    for d in DOCS:
        assert (ROOT / "docs" / f"{d}.md").exists(), d
    assert len(list((ROOT / "docs/adr").glob("0*.md"))) >= 5
    assert "```mermaid" in (ROOT / "docs/architecture.md").read_text()


def test_doc_links_resolve():
    for p in MD:
        for target in re.findall(r"\]\(([^)#\s]+)(?:#[^)]*)?\)", p.read_text()):
            if target.startswith(("http", "mailto:")):
                continue
            assert (p.parent / target).resolve().exists(), f"{p.relative_to(ROOT)} links to missing {target}"


def test_docs_match_evidence():
    r = subprocess.run([sys.executable, "scripts/render_docs.py", "--check"], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr


def test_release_gate_passes():
    r = subprocess.run([sys.executable, "scripts/gate.py"], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout


def test_source_pdfs_and_extracts_are_never_committed():
    assert not [f for f in TRACKED if f.lower().endswith(".pdf") or f.startswith("refs/")]
    assert "*.pdf" in (ROOT / ".gitignore").read_text()


def test_sources_are_credited_generally_not_copied():
    cov = flat(ROOT / "docs/interview-coverage.md")
    assert "own words" in cov and "not included" in cov


def test_nothing_claims_to_be_deployed():
    claims = re.compile(r"\b(is|was|been|are) (deployed|live|running in azure)\b|\blive demo\b", re.I)
    for p in MD:
        for line in p.read_text().splitlines():
            if claims.search(line):
                assert re.search(r"\b(not|never|nothing)\b", line, re.I), f"{p.relative_to(ROOT)}: {line.strip()}"


def test_readme_states_the_deploy_gate():
    readme = flat(ROOT / "README.md")
    assert "DEPLOY_ENABLED" in readme and "Nothing has been deployed" in readme


def test_organisations_are_fictional():
    readme = flat(ROOT / "README.md")
    assert "fictional" in readme and "Larkspur Outfitters" in readme


def test_test_data_uses_reserved_domains_and_numbers():
    data = (ROOT / "src/larkspur/data.py").read_text()
    for domain in re.findall(r"@([a-z0-9.-]+\.[a-z]+)", data):
        assert domain.endswith(("example.com", "example.org", ".invalid", ".test")), domain
    for phone in re.findall(r"\b\d{3}-\d{4}\b", data):
        assert phone.startswith("555-01"), phone


def test_no_secrets_or_storage_state_committed():
    assert not [f for f in TRACKED if "storageState" in f or f.startswith(".auth/") or f.endswith((".env", ".har.zip"))]
    bad = [re.compile(p, re.I) for p in (r"AccountKey=", r"-----BEGIN [A-Z ]*PRIVATE", r"client_secret\s*=", r"SharedAccessSignature=", r"ghp_[A-Za-z0-9]{20}")]
    for f in TRACKED:
        p = ROOT / f
        if p.suffix in {".png", ".svg", ".lock"} or p.name == "test_repo_hygiene.py":
            continue
        t = p.read_text(errors="ignore")
        for b in bad:
            assert not b.search(t), f"{b.pattern} in {f}"


def test_security_policy_has_a_fallback_contact():
    t = flat(ROOT / "SECURITY.md")
    assert "Report a vulnerability" in t and "Security contact request" in t
