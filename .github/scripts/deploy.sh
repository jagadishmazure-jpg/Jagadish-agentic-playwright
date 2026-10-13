#!/usr/bin/env bash
# Deployment steps used by .github/workflows/deploy.yml and teardown.yml. Each subcommand is
# idempotent and reads its inputs from the environment:
#   DEPLOY_TOOL   terraform | bicep
#   TARGET_ENV    dev | prod
#   LOCATION      Azure region (default eastus2)
#   ARM_* / AZURE_*  set by azure/login (OIDC) and the workflow env
#
#   deploy.sh provision   create/update the stack, write rg/app_url/registry/workspace to $GITHUB_OUTPUT
#   deploy.sh image       build the demo app image and push it to the registry (az acr build, no docker login)
#   deploy.sh smoke       the demo app answers /healthz and the Playwright workspace has local auth disabled
#   deploy.sh destroy     tear the environment down (teardown workflow only)
#
# Never run from this repository so far: DEPLOY_ENABLED is not set.
set -euo pipefail

TOOL="${DEPLOY_TOOL:-terraform}"
ENV_NAME="${TARGET_ENV:?TARGET_ENV is required}"
LOCATION="${LOCATION:-eastus2}"
STACK="infra/terraform"
OUT="${GITHUB_OUTPUT:-/dev/stdout}"

log() { echo "::group::$*"; }
end() { echo "::endgroup::"; }

tf_init() {
  : "${TFSTATE_RESOURCE_GROUP:?set repo/environment variable TFSTATE_RESOURCE_GROUP}"
  : "${TFSTATE_STORAGE_ACCOUNT:?set repo/environment variable TFSTATE_STORAGE_ACCOUNT}"
  terraform -chdir="$STACK" init -input=false \
    -backend-config="envs/${ENV_NAME}.backend.hcl" \
    -backend-config="resource_group_name=${TFSTATE_RESOURCE_GROUP}" \
    -backend-config="storage_account_name=${TFSTATE_STORAGE_ACCOUNT}" \
    -backend-config="container_name=${TFSTATE_CONTAINER:-tfstate}"
}

provision() {
  local image_args=()
  [[ -n "${APP_IMAGE:-}" ]] && image_args=(-var "app_image=${APP_IMAGE}")
  if [[ "$TOOL" == "terraform" ]]; then
    log "terraform apply ($ENV_NAME)"
    tf_init
    terraform -chdir="$STACK" apply -auto-approve -input=false -var-file="envs/${ENV_NAME}.tfvars" -var "location=${LOCATION}" \
      -var "test_runner_principal_id=${RUNNER_PRINCIPAL_ID:-}" "${image_args[@]}"
    rg=$(terraform -chdir="$STACK" output -raw AZURE_RESOURCE_GROUP)
    url=$(terraform -chdir="$STACK" output -raw APP_URL)
    acr=$(terraform -chdir="$STACK" output -raw REGISTRY_LOGIN_SERVER)
    pw=$(terraform -chdir="$STACK" output -raw PLAYWRIGHT_WORKSPACE_ID)
    end
  else
    log "bicep: az deployment sub create ($ENV_NAME)"
    outputs=$(az deployment sub create --name "agpw-${ENV_NAME}-${GITHUB_RUN_ID:-local}" \
      --location "$LOCATION" --template-file infra/bicep/main.bicep \
      --parameters environment="$ENV_NAME" location="$LOCATION" appImage="${APP_IMAGE:-}" testRunnerPrincipalId="${RUNNER_PRINCIPAL_ID:-}" \
      --query properties.outputs -o json)
    rg=$(jq -r .AZURE_RESOURCE_GROUP.value <<<"$outputs")
    url=$(jq -r .APP_URL.value <<<"$outputs")
    acr=$(jq -r .REGISTRY_LOGIN_SERVER.value <<<"$outputs")
    pw=$(jq -r .PLAYWRIGHT_WORKSPACE_ID.value <<<"$outputs")
    end
  fi
  { echo "resource_group=$rg"; echo "app_url=$url"; echo "registry=$acr"; echo "workspace_id=$pw"; } >>"$OUT"
}

image() {
  : "${REGISTRY:?}"
  local tag="larkspur:${GITHUB_SHA:-local}"
  az acr build --registry "${REGISTRY%%.*}" --image "$tag" --file Dockerfile . >/dev/null
  echo "app_image=${REGISTRY}/${tag}" >>"$OUT"
}

smoke() {
  : "${APP_URL:?}" "${WORKSPACE_ID:?}"
  for _ in $(seq 1 20); do curl -fsS "${APP_URL}/healthz" >/dev/null && break; sleep 6; done
  curl -fsS "${APP_URL}/healthz" >/dev/null || { echo "::error::demo app not healthy at ${APP_URL}"; exit 1; }
  auth=$(az resource show --ids "$WORKSPACE_ID" --query properties.localAuth -o tsv)
  [[ "$auth" == "Disabled" ]] || { echo "::error::Playwright workspace localAuth is '$auth', expected Disabled"; exit 1; }
  echo "smoke checks passed: app healthy, workspace Entra-only"
}

destroy() {
  if [[ "$TOOL" == "terraform" ]]; then
    tf_init
    terraform -chdir="$STACK" destroy -auto-approve -input=false -var-file="envs/${ENV_NAME}.tfvars" -var "location=${LOCATION}"
  else
    case "$LOCATION" in eastus) short=eus ;; eastus2) short=eus2 ;; westus3) short=wus3 ;; westeurope) short=weu ;; *) exit 1 ;; esac
    az group delete --name "rg-agpw-${ENV_NAME}-${short}-001" --yes
  fi
}

"$@"
