// Azure Playwright workspace (Azure App Testing): cloud browsers, Entra ID only.
param location string
@minLength(3)
@maxLength(24)
param name string
param tags object
param testRunnerPrincipalId string = ''

resource workspace 'Microsoft.LoadTestService/playwrightWorkspaces@2025-09-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    localAuth: 'Disabled'
    regionalAffinity: 'Enabled'
  }
}

var contributorRoleId = 'b24988ac-6180-42a0-ab88-20f7382dd24c'

resource runner 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(testRunnerPrincipalId)) {
  name: guid(workspace.id, testRunnerPrincipalId, contributorRoleId)
  scope: workspace
  properties: {
    principalId: testRunnerPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', contributorRoleId)
  }
}

output id string = workspace.id
output dataplaneUri string = workspace.properties.dataplaneUri
