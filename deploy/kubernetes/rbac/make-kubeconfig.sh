#!/usr/bin/env bash
#
# Prints the KUBE_CONFIG GitHub secret: a kubeconfig for the github-deployer
# account (deploy/kubernetes/rbac/deployer.yaml), base64-encoded on one line.
#
# Usage (with an admin kubeconfig, after applying deployer.yaml):
#   ./deploy/kubernetes/rbac/make-kubeconfig.sh https://<api-server>:6443
#   ./deploy/kubernetes/rbac/make-kubeconfig.sh https://<api-server>:6443 | gh secret set KUBE_CONFIG --env production
#
set -euo pipefail

SERVER="${1:-}"
NAMESPACE="${NAMESPACE:-pool-tracker-prod}"
ACCOUNT="${ACCOUNT:-github-deployer}"

if [ -z "$SERVER" ]; then
    echo "Usage: $0 https://<api-server>:6443" >&2
    exit 1
fi

secret="${ACCOUNT}-token"
# The token is filled in by Kubernetes a moment after the Secret is created
for _ in $(seq 1 30); do
    token="$(kubectl -n "$NAMESPACE" get secret "$secret" -o jsonpath='{.data.token}' 2>/dev/null || true)"
    [ -n "$token" ] && break
    sleep 1
done
if [ -z "${token:-}" ]; then
    echo "Secret $NAMESPACE/$secret has no token: apply deploy/kubernetes/rbac/deployer.yaml first" >&2
    exit 1
fi
ca="$(kubectl -n "$NAMESPACE" get secret "$secret" -o jsonpath='{.data.ca\.crt}')"
token="$(printf '%s' "$token" | base64 --decode)"

# base64 without line breaks, on Linux and macOS
cat <<KUBECONFIG | base64 | tr -d '\n'
apiVersion: v1
kind: Config
clusters:
  - name: deploy
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${ca}
users:
  - name: ${ACCOUNT}
    user:
      token: ${token}
contexts:
  - name: deploy
    context:
      cluster: deploy
      user: ${ACCOUNT}
      namespace: ${NAMESPACE}
current-context: deploy
KUBECONFIG
echo
