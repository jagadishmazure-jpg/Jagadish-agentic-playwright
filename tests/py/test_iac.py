"""Static checks on the Terraform and Bicep stacks (the real checks are terraform test, tflint, checkov, bicep build)."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TF = (ROOT / "infra/terraform/main.tf").read_text()
BICEP = (ROOT / "infra/bicep/modules/playwright.bicep").read_text()
APP_BICEP = (ROOT / "infra/bicep/modules/app.bicep").read_text()


def test_both_stacks_use_the_ga_playwright_workspace_api_with_local_auth_disabled():
    assert "Microsoft.LoadTestService/playwrightWorkspaces@2025-09-01" in TF
    assert "Microsoft.LoadTestService/playwrightWorkspaces@2025-09-01" in BICEP
    assert re.search(r"localAuth\s+= \"Disabled\"", TF) and "localAuth: 'Disabled'" in BICEP


def test_registry_has_no_admin_user_and_app_pulls_with_managed_identity():
    assert re.search(r"admin_enabled\s+= false", TF) and "adminUserEnabled: false" in APP_BICEP
    assert 'role_definition_name = "AcrPull"' in TF


def test_app_scales_to_zero_in_both_stacks():
    assert "min_replicas = 0" in TF and "minReplicas: 0" in APP_BICEP


def test_service_config_uses_entra_id_and_never_a_token():
    cfg = (ROOT / "playwright.service.config.ts").read_text()
    assert "ServiceAuth.ENTRA_ID" in cfg and "DefaultAzureCredential" in cfg
    assert "ACCESS_TOKEN" not in cfg
    assert "PLAYWRIGHT_SERVICE_URL is not set" in cfg
