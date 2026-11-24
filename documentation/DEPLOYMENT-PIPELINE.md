# Production Deployment Pipeline

One workflow, `.github/workflows/production-deployment.yml`, builds and deploys production. It runs on every push to `main`, and on demand:

```bash
gh workflow run production-deployment.yml --repo epitech-nice/PoolTracker
```

Secrets and cluster access: [SECRETS-SETUP.md](SECRETS-SETUP.md).

## Jobs

The workflow token is read-only (`contents: read`); only the build job can also write packages.

### Build & Push Docker Image

Builds the root `Dockerfile` for `linux/amd64` and `linux/arm64` and pushes `ghcr.io/epitech-nice/pool-tracker` with the tags `latest`, `main` and `main-<sha>`.

### Deploy to Production Kubernetes

Runs in the GitHub environment `production`, one deployment at a time.

| Step | What it does |
|------|--------------|
| Connect to the cluster | Writes `KUBE_CONFIG` to a temporary kubeconfig and checks that `github-deployer` can deploy |
| Create Production Secrets | Creates or updates `pool-tracker-secret-prod` |
| Registry access | Creates or updates the GHCR pull secret from `GHCR_PULL_TOKEN` |
| Apply ConfigMap | `production/configmap.yaml` |
| Deploy Database | Checks that the PVC still matches the manifest (stops otherwise, never deletes it), applies `production/database.yaml` and waits for MySQL |
| Deploy Application | Applies the deployment, service and ingress, then restarts the deployment so the new `latest` image is pulled |
| Verify Rollout | Waits for the rollout; prints the deployment, pods, logs and events on failure |
| Verify Deployment | Lists the resources and reports the TLS certificate status |
| Smoke tests | Through `https://pool.nice-tek.eu`: `/health`, `/` and `/api/health` (Node and the database) answer 200, `/api/auth/profile` answers 401, HSTS header present |

## Rollback

The image is deployed as `latest`, so the previous version is the previous ReplicaSet:

```bash
kubectl rollout history deployment/pool-tracker-deployment-prod -n pool-tracker-prod
kubectl rollout undo deployment/pool-tracker-deployment-prod -n pool-tracker-prod
```

Pods recreated later (node reboot) pull `latest` again, so a lasting rollback means reverting the commit on `main`.

## Status and logs

```bash
gh run list --workflow production-deployment.yml --repo epitech-nice/PoolTracker
gh run view <run-id> --log-failed --repo epitech-nice/PoolTracker

kubectl get deployments,pods,services,pvc -n pool-tracker-prod
kubectl logs deployment/pool-tracker-deployment-prod -n pool-tracker-prod --tail=100
kubectl get events -n pool-tracker-prod --sort-by=.lastTimestamp
```
