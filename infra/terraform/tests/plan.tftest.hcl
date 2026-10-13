# Offline plan tests: mocked providers, no Azure credentials, nothing created.
#   terraform init -backend=false && terraform test
mock_provider "azurerm" {
  mock_data "azurerm_client_config" {
    defaults = {
      tenant_id       = "00000000-0000-0000-0000-000000000001"
      subscription_id = "00000000-0000-0000-0000-000000000002"
      object_id       = "00000000-0000-0000-0000-000000000003"
    }
  }
}

mock_provider "azapi" {}

override_resource {
  target          = azurerm_user_assigned_identity.app
  override_during = plan
  values = {
    id           = "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-app"
    principal_id = "00000000-0000-0000-0000-000000000004"
  }
}

override_resource {
  target          = azurerm_resource_group.this
  override_during = plan
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg-agpw-dev-eus2-001"
  }
}

run "dev_defaults" {
  command = plan

  variables {
    environment = "dev"
  }

  assert {
    condition     = azurerm_resource_group.this.name == "rg-agpw-dev-eus2-001"
    error_message = "CAF-style resource group name"
  }

  assert {
    condition     = azapi_resource.playwright.type == "Microsoft.LoadTestService/playwrightWorkspaces@2025-09-01"
    error_message = "Playwright workspace uses the GA API version"
  }

  assert {
    condition     = azapi_resource.playwright.body.properties.localAuth == "Disabled"
    error_message = "access tokens are disabled: Entra ID only"
  }

  assert {
    condition     = !azurerm_container_registry.this.admin_enabled && !azurerm_container_registry.this.anonymous_pull_enabled
    error_message = "registry has no admin user and no anonymous pull"
  }

  assert {
    condition     = azurerm_container_app.demo.template[0].min_replicas == 0
    error_message = "demo app scales to zero"
  }

  assert {
    condition     = length(azurerm_container_app.demo.registry) == 0
    error_message = "placeholder image needs no registry credentials"
  }

  assert {
    condition     = length(azurerm_role_assignment.runner) == 0
    error_message = "no runner role without a principal"
  }

  assert {
    condition     = !azurerm_log_analytics_workspace.this.local_authentication_enabled
    error_message = "Log Analytics accepts Entra ID only"
  }
}

run "prod_with_image_and_runner" {
  command = plan

  variables {
    environment              = "prod"
    app_image                = "cragpwprodeus2001.azurecr.io/larkspur:1.0.0"
    allowed_ingress_cidrs    = ["203.0.113.0/24"]
    test_runner_principal_id = "00000000-0000-0000-0000-000000000005"
    log_retention_days       = 90
  }

  assert {
    condition     = length(azurerm_container_app.demo.registry) == 1
    error_message = "real image is pulled with the managed identity"
  }

  assert {
    condition     = length(azurerm_container_app.demo.ingress[0].ip_security_restriction) == 1
    error_message = "ingress restricted to the allowed CIDRs"
  }

  assert {
    condition     = length(azurerm_role_assignment.runner) == 1
    error_message = "the CI identity can use the workspace"
  }
}
