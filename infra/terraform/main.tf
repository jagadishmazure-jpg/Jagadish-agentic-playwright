# Agentic Playwright: cloud test infrastructure.
#   * Azure Playwright workspace (cloud browsers, Entra ID only: local auth off)
#   * Container Apps environment + the Larkspur demo app (so cloud browsers and the browser agent have
#     a reachable target), with a user-assigned identity that pulls from a private registry
#   * Log Analytics for app logs
# Nothing here has been applied from this repository.

resource "azurerm_resource_group" "this" {
  name     = "rg-${local.suffix}-001"
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                         = "log-${local.suffix}-001"
  location                     = azurerm_resource_group.this.location
  resource_group_name          = azurerm_resource_group.this.name
  sku                          = "PerGB2018"
  retention_in_days            = var.log_retention_days
  daily_quota_gb               = 1
  local_authentication_enabled = false
  tags                         = local.tags
}

resource "azurerm_container_registry" "this" {
  #checkov:skip=CKV_AZURE_165:geo-replication needs Premium; a demo registry stays Basic
  #checkov:skip=CKV_AZURE_164:content trust (signed images) needs Premium; images are signed with cosign in CI instead
  #checkov:skip=CKV_AZURE_166:image quarantine needs Premium
  #checkov:skip=CKV_AZURE_163:vulnerability scanning is done in CI (Trivy) before push
  #checkov:skip=CKV_AZURE_233:zone redundancy needs Premium
  #checkov:skip=CKV_AZURE_237:dedicated data endpoints need Premium
  #checkov:skip=CKV_AZURE_139:public network access is needed by GitHub-hosted runners to push; admin user is off and pulls use a managed identity
  #checkov:skip=CKV_AZURE_167:retention policy for untagged manifests needs Premium
  name                   = replace("cr${local.suffix}001", "-", "")
  location               = azurerm_resource_group.this.location
  resource_group_name    = azurerm_resource_group.this.name
  sku                    = "Basic"
  admin_enabled          = false
  anonymous_pull_enabled = false
  tags                   = local.tags
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "id-${local.suffix}-app"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags
}

resource "azurerm_role_assignment" "app_acr_pull" {
  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_container_app_environment" "this" {
  name                       = "cae-${local.suffix}-001"
  location                   = azurerm_resource_group.this.location
  resource_group_name        = azurerm_resource_group.this.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  tags                       = local.tags
}

resource "azurerm_container_app" "demo" {
  name                         = "ca-${local.suffix}-demo"
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = azurerm_resource_group.this.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  dynamic "registry" {
    for_each = var.app_image != "" ? [1] : []
    content {
      server   = azurerm_container_registry.this.login_server
      identity = azurerm_user_assigned_identity.app.id
    }
  }

  template {
    min_replicas = 0 # scale to zero between test runs
    max_replicas = 1
    container {
      name   = "larkspur"
      image  = local.image
      cpu    = 0.25
      memory = "0.5Gi"
      env {
        # Test-only endpoints (OTP lookup, reset) stay ON because this app exists to be tested.
        # It holds only synthetic data. Never reuse this setting for a real application.
        name  = "LARKSPUR_TEST_MODE"
        value = "1"
      }
      liveness_probe {
        transport = "HTTP"
        path      = "/healthz"
        port      = 8765
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8765
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
    dynamic "ip_security_restriction" {
      for_each = var.allowed_ingress_cidrs
      content {
        name             = "allow-${ip_security_restriction.key}"
        action           = "Allow"
        ip_address_range = ip_security_restriction.value
      }
    }
  }
}

# Azure Playwright workspace (Azure App Testing). GA API version; local (access-token) auth disabled so
# only Entra ID identities can run browsers.
resource "azapi_resource" "playwright" {
  type      = "Microsoft.LoadTestService/playwrightWorkspaces@2025-09-01"
  name      = "pw-${local.suffix}"
  parent_id = azurerm_resource_group.this.id
  location  = var.location
  tags      = local.tags
  body = {
    properties = {
      localAuth        = "Disabled"
      regionalAffinity = "Enabled"
    }
  }
  response_export_values = ["properties.dataplaneUri"]
}

resource "azurerm_role_assignment" "runner" {
  count                = var.test_runner_principal_id == "" ? 0 : 1
  scope                = azapi_resource.playwright.id
  role_definition_name = "Contributor"
  principal_id         = var.test_runner_principal_id
  principal_type       = "ServicePrincipal"
}
