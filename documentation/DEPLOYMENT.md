# Deployment (Kubernetes + GitHub Actions)

PoolTracker runs on the k3s cluster of the VPS, behind Traefik, with TLS from cert-manager (Let's Encrypt). GitHub Actions builds one image and deploys it with a deploy account limited to the app's namespace.

| Environment | URL | Branch | Namespace | Secret/Variable prefix | GitHub environment |
|---|---|---|---|---|---|
| Production | https://pool.nice-tek.eu (`www.` redirects to it) | `main` | `pool-tracker-prod` | `PRD_` | `production` |
| Staging | https://pool.ppd.nice-tek.eu | `develop` | `pool-tracker-staging` | `PPD_` | `staging` |

```
browser ─HTTPS─> Traefik (Ingress pool-tracker-web, middlewares)
                   └─> Service pool-tracker-web:80
                         └─> pod pool-tracker-web :8080
                               nginx: client build, /api -> Node :3001
                                                      └─> Service pool-tracker-db:3306
                                                            └─> pod pool-tracker-db (MySQL 8.0)
                                                                  └─> PVC pool-tracker-db-data
CronJob pool-tracker-db-backup (production, 03:00 UTC) ──> PVC pool-tracker-backups
```

## Files

| Path | Content |
|---|---|
| `k8s/cluster/namespace.yaml` | Both namespaces (cluster admin, once) |
| `k8s/rbac/deployer.yaml`, `deployer-staging.yaml` | Deploy account `github-deployer` per namespace (cluster admin, once) |
| `k8s/rbac/make-kubeconfig.sh` | Prints the `PRD_KUBE_CONFIG` / `PPD_KUBE_CONFIG` secret |
| `k8s/base/` | Manifests shared by both environments: constants ConfigMap, MySQL (PVC, Deployment, Service), web Deployment and Service, Traefik middlewares |
| `k8s/production/` | Production overlay: Ingress (+ `www` redirect), backup CronJob and its volume |
| `k8s/staging/` | Staging overlay: Ingress, database name `pool_tracker_staging`, 2 Gi volume |
| `.github/workflows/ci.yaml` | Pull requests and before each build: client lint and build, server start against MySQL, `/api/health`, login cookie |
| `.github/workflows/build.yaml` | Push on `main` or `develop`: checks, image `ghcr.io/epitech-nice/pool-tracker:<sha>` (`latest` for `main` only), then deploy |
| `.github/workflows/deploy.yaml` | Reusable deploy (one call per environment) |
| `Dockerfile` | Image: Vite build of the client, Node 24 server, nginx; runs as uid 1000 |

Kubernetes objects carry `app.kubernetes.io/name=pool-tracker`, `app.kubernetes.io/component` (`web`, `database`, `backup`), `app.kubernetes.io/part-of=pool-tracker` and `app.kubernetes.io/managed-by=kustomize`.

## One-time setup (cluster admin)

On the VPS, `kubectl` is `sudo kubectl`.

```bash
kubectl apply -f k8s/cluster/namespace.yaml
kubectl apply -f k8s/rbac/deployer.yaml -f k8s/rbac/deployer-staging.yaml

# Store each environment's kubeconfig without displaying it
./k8s/rbac/make-kubeconfig.sh https://<api-server>:6443 \
  | gh secret set PRD_KUBE_CONFIG --repo epitech-nice/PoolTracker
NAMESPACE=pool-tracker-staging ./k8s/rbac/make-kubeconfig.sh https://<api-server>:6443 \
  | gh secret set PPD_KUBE_CONFIG --repo epitech-nice/PoolTracker
```

The deploy accounts manage only the kinds the manifests use (ConfigMaps, Secrets, Services, PVCs, Deployments, Ingresses, Traefik Middlewares, CronJobs), with no delete, no exec and nothing outside their namespace. Removing an object is a deliberate admin action.

Shared with the other applications of the cluster, and installed by the admin: cert-manager and the `letsencrypt-prod` ClusterIssuer. cert-manager creates and renews each certificate from the `cert-manager.io/cluster-issuer` annotation of the Ingress.

### Check the deploy account

```bash
SA=system:serviceaccount:pool-tracker-prod:github-deployer
kubectl auth can-i patch cronjobs.batch -n pool-tracker-prod --as=$SA          # yes
kubectl auth can-i delete persistentvolumeclaims -n pool-tracker-prod --as=$SA # no
kubectl auth can-i get secrets -n kube-system --as=$SA                         # no
```

## GitHub settings

Secrets and Variables are **repository-level**, prefixed with `PRD_` (production) or `PPD_` (staging): `PRD_JWT_SECRET`, `PPD_JWT_SECRET`... The deploy workflow receives the prefix from `build.yaml` and reads `secrets[<prefix>_<NAME>]`. The GitHub environments `production` and `staging` only record the deployments and their URL; they hold no secret.

Repository-level secrets are readable by every workflow of the repository, whatever the branch: changes to `.github/workflows/` deserve the same review as production access.

### Secrets

| Secret (`PRD_` / `PPD_` prefix) | Required | Use |
|---|---|---|
| `<prefix>_KUBE_CONFIG` | yes | Kubeconfig of the environment's `github-deployer` |
| `<prefix>_DB_USER`, `<prefix>_DB_PASSWORD` | yes | MySQL user of the app (also created by MySQL when its volume is initialized) |
| `<prefix>_MYSQL_ROOT_PASSWORD` | yes | MySQL root (backups, admin); distinct from the app password |
| `<prefix>_JWT_SECRET` | yes | Session signing key (32+ random characters) |
| `<prefix>_ADMIN_INITIAL_EMAIL`, `<prefix>_ADMIN_INITIAL_PASSWORD` | no | First admin account, only when the database has no admin |
| `GHCR_PULL_TOKEN` (no prefix) | yes (private package) | Classic PAT with only `read:packages`: the cluster pulls the image with it |
| `GHCR_PULL_USER` (no prefix) | no | Owner of that PAT, if not the repository owner |

The workflow writes them into the Kubernetes Secrets `pool-tracker-app` (application), `pool-tracker-db` (MySQL) and `github-container-registry` (pull secret). Values reach the scripts through `env:` only. Generate a value and store it without displaying it:

```bash
openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-32 | gh secret set PPD_DB_PASSWORD --repo epitech-nice/PoolTracker
```

### Variables

| Variable | Required | Use |
|---|---|---|
| `<prefix>_PUBLIC_SITE_URL` | yes | Environment URL and smoke tests (`https://pool.nice-tek.eu`, `https://pool.ppd.nice-tek.eu`) |
| `<prefix>_CORS_ORIGIN` | no | Other origins allowed to call the API (off by default: same origin) |
| `IMAGE_PLATFORMS` (no prefix) | no | Build platforms (default `linux/amd64`) |

They become the ConfigMap `pool-tracker-app-config`. Constants (`NODE_ENV`, `DB_HOST`, `DB_NAME`) are in `k8s/base/configmap.yaml`.

## Deploying

A push on `main` deploys production; a push on `develop` deploys staging. The flow is feature branch → pull request to `develop` (staging) → pull request to `main` (production).

Deploy steps: connect with `<prefix>_KUBE_CONFIG`, check the account's rights, registry pull secret, settings, secrets, `kubectl apply -k` with the image tag set to the commit SHA, rollout of the database then the web pod, smoke tests on `<prefix>_PUBLIC_SITE_URL` (`/api/health`, `/`, `/api/auth/profile` = 401, HSTS header). On failure the job prints pods, logs and events.

### Probes

- Startup and liveness: `/api/health/live` (nginx and Node answer, no database: a database outage does not restart the app).
- Readiness: `/api/health` (`SELECT 1`): during a database outage the pod leaves the routing.

The web Deployment runs **one replica**: the daily quest scheduler runs inside the Node process.

## Operations

```bash
N=pool-tracker-prod   # or pool-tracker-staging
kubectl -n $N get deployments,pods,ingress,cronjobs,pvc
kubectl -n $N logs -l app.kubernetes.io/component=web -f
kubectl -n $N logs -l app.kubernetes.io/component=database --tail=100
kubectl -n $N exec deploy/pool-tracker-web -- wget -qO- 127.0.0.1:8080/api/health
```

### Rollback

Each deployment uses the image of its commit, so the previous ReplicaSet is the previous version:

```bash
kubectl -n $N rollout history deploy/pool-tracker-web
kubectl -n $N rollout undo deploy/pool-tracker-web
```

For a lasting rollback, revert the commit on the branch: the next deployment would otherwise bring it back.

### Backups

- Production: the CronJob `pool-tracker-db-backup` dumps the database every day at 03:00 UTC into the volume `pool-tracker-backups` (gzip, kept 14 days). Dumps stay on the server.
- Run one now: `kubectl -n pool-tracker-prod create job --from=cronjob/pool-tracker-db-backup backup-now`.
- On-demand dump, download, restore and diff: [KUBE-DB-BACKUP.md](KUBE-DB-BACKUP.md) (`scripts/kube-db-manager.sh` on the VPS, `scripts/kube-db-local.sh` from your machine).

Both volumes use `local-path-retain`: deleting a PVC keeps its data directory on the node.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Secret PRD_KUBE_CONFIG is missing` (or `PPD_`) | Environment not set up | Run `make-kubeconfig.sh` for that environment |
| `The deploy account cannot manage <kind>` | A manifest uses a kind missing from the Role | Add it to `k8s/rbac/deployer*.yaml` and apply as admin |
| `Secret PRD_<NAME> is required` (or `PPD_`) | Secret missing | Set it in Settings → Secrets and variables → Actions |
| Pods in `ImagePullBackOff` | `GHCR_PULL_TOKEN` missing or expired | Create a new `read:packages` PAT and update the secret |
| Web pod not ready, `/api/health` = 503 | Database unreachable | `kubectl -n $N logs -l app.kubernetes.io/component=database` |
| Certificate not ready on a new host | DNS not pointing to the VPS, or HTTP-01 challenge blocked | `kubectl -n $N get certificate,challenges`; check the DNS record |
| `field is immutable` on apply | A selector or a PVC spec changed | Planned migration: backup, recreate the object, restore |
