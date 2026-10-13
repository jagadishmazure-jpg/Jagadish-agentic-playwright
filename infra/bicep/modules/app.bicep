// Log Analytics + private registry + Container Apps environment + the Larkspur demo app.
param location string
param suffix string
param tags object
param appImage string
param allowedIngressCidrs array
param logRetentionDays int

var image = empty(appImage) ? 'mcr.microsoft.com/k8se/quickstart:latest' : appImage
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${suffix}-001'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: logRetentionDays
    workspaceCapping: { dailyQuotaGb: 1 }
    features: { disableLocalAuth: true }
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('cr${suffix}001', '-', '')
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
  }
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${suffix}-app'
  location: location
  tags: tags
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, acrPullRoleId)
  scope: registry
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${suffix}-001'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource demo 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${suffix}-demo'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  dependsOn: [acrPull]
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      activeRevisionsMode: 'Single'
      registries: empty(appImage) ? [] : [{ server: registry.properties.loginServer, identity: identity.id }]
      ingress: {
        external: true
        targetPort: 8765
        transport: 'auto'
        ipSecurityRestrictions: [for (cidr, i) in allowedIngressCidrs: { name: 'allow-${i}', action: 'Allow', ipAddressRange: cidr }]
      }
    }
    template: {
      scale: { minReplicas: 0, maxReplicas: 1 }
      containers: [
        {
          name: 'larkspur'
          image: image
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          // Test-only endpoints stay on: synthetic data only. Never copy this to a real app.
          env: [{ name: 'LARKSPUR_TEST_MODE', value: '1' }]
          probes: [{ type: 'Liveness', httpGet: { path: '/healthz', port: 8765 } }]
        }
      ]
    }
  }
}

output appUrl string = 'https://${demo.properties.configuration.ingress.fqdn}'
output registryLoginServer string = registry.properties.loginServer
