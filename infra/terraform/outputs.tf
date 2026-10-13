output "AZURE_RESOURCE_GROUP" {
  value = azurerm_resource_group.this.name
}

output "APP_URL" {
  value = "https://${azurerm_container_app.demo.ingress[0].fqdn}"
}

output "REGISTRY_LOGIN_SERVER" {
  value = azurerm_container_registry.this.login_server
}

output "PLAYWRIGHT_WORKSPACE_ID" {
  value = azapi_resource.playwright.id
}

output "PLAYWRIGHT_DATAPLANE_URI" {
  description = "Base for PLAYWRIGHT_SERVICE_URL (see docs/azure.md)"
  value       = try(azapi_resource.playwright.output.properties.dataplaneUri, "")
}
