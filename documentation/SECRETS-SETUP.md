# GitHub Secrets and Cluster Access

The workflow `.github/workflows/production-deployment.yml` reads the secrets below. Secret values are only passed to scripts through `env:` and quoted shell variables, never written into `run:` blocks.

## Secrets

| Secret | Scope | Used for |
|--------|-------|----------|
| `KUBE_CONFIG` | Environment `production` | Base64 kubeconfig of the `github-deployer` account (see below) |
| `GHCR_PULL_TOKEN` | Repository | Classic PAT with only `read:packages`: the cluster pulls the private image with it |
| `GHCR_PULL_USER` | Repository, optional | Owner of that PAT, if it is not the repository owner |
| `DB_USER` | Repository | MySQL user of the application |
| `DB_PASSWORD` | Repository | Password of that user |
| `JWT_SECRET` | Repository | JWT signing key (32+ random characters) |
| `SESSION_SECRET` | Repository | Session key |

`GITHUB_TOKEN` (automatic) only pushes the image to GHCR during the build; it expires with the job, so it cannot be used as the cluster pull secret.

The workflow writes `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` and `SESSION_SECRET` into the Kubernetes Secret `pool-tracker-secret-prod`, and the PAT into `github-container-registry`.

Generate a random value:

```bash
openssl rand -base64 32
```

Set a secret without echoing it:

```bash
gh secret set JWT_SECRET --repo epitech-nice/PoolTracker          # prompts for the value
gh secret set KUBE_CONFIG --repo epitech-nice/PoolTracker --env production < kubeconfig.b64
```

## Cluster access: the `github-deployer` account

The workflow deploys with the ServiceAccount `pool-tracker-prod/github-deployer`. Its Role ([deployer.yaml](../deploy/kubernetes/rbac/deployer.yaml)) only covers the `pool-tracker-prod` namespace and the resource kinds PoolTracker uses: ConfigMaps, Secrets, Services, PVCs, Deployments, Ingress, Traefik IngressRoutes and Middlewares, plus read access to pods, logs, events and cert-manager certificates. There is no delete, no exec and nothing cluster-wide.

One-time setup, with an admin kubeconfig (on the VPS: `sudo kubectl`):

```bash
kubectl apply -f deploy/kubernetes/namespaces.yaml
kubectl apply -f deploy/kubernetes/rbac/deployer.yaml

# Prints the KUBE_CONFIG secret (base64, one line) and stores it without displaying it
./deploy/kubernetes/rbac/make-kubeconfig.sh https://<api-server>:6443 \
  | gh secret set KUBE_CONFIG --repo epitech-nice/PoolTracker --env production
```

Check the account:

```bash
SA=system:serviceaccount:pool-tracker-prod:github-deployer
kubectl auth can-i create deployments.apps -n pool-tracker-prod --as=$SA   # yes
kubectl auth can-i delete persistentvolumeclaims -n pool-tracker-prod --as=$SA   # no
kubectl auth can-i create deployments.apps -n kube-system --as=$SA   # no
```

The first workflow step runs the same `can-i` check and stops with an explicit error if the account cannot deploy.

### Rotating the token

The token is stored in the Secret `github-deployer-token`. To rotate it, delete that Secret, apply `deployer.yaml` again (Kubernetes issues a new token) and run `make-kubeconfig.sh` again.

## What stays with the cluster admin

The deploy account cannot touch cluster-wide resources, so these are installed and upgraded by hand, once for the whole cluster:

- the `pool-tracker-prod` namespace (`deploy/kubernetes/namespaces.yaml`);
- cert-manager and the `letsencrypt-prod` ClusterIssuer (shared with the other applications on the cluster). The TLS certificate itself is created and renewed by cert-manager from the `cert-manager.io/cluster-issuer` annotation of the Ingress;
- a PVC change (storage class or size): the workflow stops with an error instead of touching the volume. See [KUBE-DB-BACKUP.md](KUBE-DB-BACKUP.md) for backup and restore.

## Troubleshooting

| Error in the workflow | Fix |
|-----------------------|-----|
| `Secret KUBE_CONFIG is missing` | Run `make-kubeconfig.sh` and set the secret in the `production` environment |
| `The deploy account cannot deploy in pool-tracker-prod` | Apply `deploy/kubernetes/rbac/deployer.yaml` |
| `... is forbidden: User "system:serviceaccount:pool-tracker-prod:github-deployer" cannot ...` | A manifest uses a resource kind missing from the Role: add it to `deployer.yaml` and apply it |
| Pods in `ImagePullBackOff` | `GHCR_PULL_TOKEN` missing or expired |
