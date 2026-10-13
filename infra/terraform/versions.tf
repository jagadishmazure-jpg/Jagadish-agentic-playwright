terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.9"
    }
    # Only for the Playwright workspace (Microsoft.LoadTestService/playwrightWorkspaces), which azurerm
    # does not model yet.
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.5"
    }
  }
}
