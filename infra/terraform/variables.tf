variable "environment" {
  description = "dev or prod"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod"
  }
}

variable "location" {
  description = "Azure region for the app and the Playwright workspace"
  type        = string
  default     = "eastus2"
}

variable "app_image" {
  description = "Container image for the demo app. Empty deploys a public placeholder image until CI pushes the real one to the registry."
  type        = string
  default     = ""
}

variable "allowed_ingress_cidrs" {
  description = "Client CIDRs allowed to reach the demo app. Empty means open ingress (fine for a short-lived demo, not for anything real)."
  type        = list(string)
  default     = []
}

variable "test_runner_principal_id" {
  description = "Object id of the CI identity that runs Playwright tests in the workspace (OIDC federated). Empty skips the role assignment."
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "Log Analytics retention for app and environment logs"
  type        = number
  default     = 30
}
