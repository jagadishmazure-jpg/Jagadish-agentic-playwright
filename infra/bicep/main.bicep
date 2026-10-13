// Agentic Playwright: Bicep twin of infra/terraform (same resources and names). Never deployed from this repo.
targetScope = 'subscription'

@allowed(['dev', 'prod'])
param environment string
param location string = 'eastus2'
@description('Container image for the demo app; empty uses a public placeholder image.')
param appImage string = ''
@description('Client CIDRs allowed to reach the app; empty means open ingress.')
param allowedIngressCidrs array = []
@description('Object id of the CI identity that runs tests in the workspace; empty skips the role assignment.')
param testRunnerPrincipalId string = ''
param logRetentionDays int = 30

var shortLocation = {
  eastus: 'eus'
  eastus2: 'eus2'
  westus3: 'wus3'
  westeurope: 'weu'
}[location]
var suffix = 'agpw-${environment}-${shortLocation}'
var tags = {
  project: 'agentic-playwright'
  environment: environment
  managed_by: 'bicep'
  cost_center: 'portfolio-demo'
}

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-${suffix}-001'
  location: location
  tags: tags
}

module app 'modules/app.bicep' = {
  name: 'app'
  scope: rg
  params: {
    location: location
    suffix: suffix
    tags: tags
    appImage: appImage
    allowedIngressCidrs: allowedIngressCidrs
    logRetentionDays: logRetentionDays
  }
}

module playwright 'modules/playwright.bicep' = {
  name: 'playwright'
  scope: rg
  params: {
    location: location
    name: 'pw-${suffix}'
    tags: tags
    testRunnerPrincipalId: testRunnerPrincipalId
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output APP_URL string = app.outputs.appUrl
output REGISTRY_LOGIN_SERVER string = app.outputs.registryLoginServer
output PLAYWRIGHT_WORKSPACE_ID string = playwright.outputs.id
output PLAYWRIGHT_DATAPLANE_URI string = playwright.outputs.dataplaneUri
