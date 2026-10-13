locals {
  short_location = {
    eastus     = "eus"
    eastus2    = "eus2"
    westus3    = "wus3"
    westeurope = "weu"
  }[var.location]

  suffix = "agpw-${var.environment}-${local.short_location}"
  tags = {
    project     = "agentic-playwright"
    environment = var.environment
    managed_by  = "terraform"
    cost_center = "portfolio-demo"
  }
  image = var.app_image != "" ? var.app_image : "mcr.microsoft.com/k8se/quickstart:latest"
}
