# Kubernetes Database Backup & Restore

Management scripts for backing up and restoring the PoolTracker MySQL database running inside the K8s cluster on the production VPS.

## Files

| Script | Where it runs | Purpose |
|--------|--------------|---------|
| `scripts/kube-db-manager.sh` | **VPS** (deployed at `~/kube-db-manager.sh`) | Core engine — talks to kubectl and the MySQL pod |
| `scripts/kube-db-local.sh` | **Local machine** (macOS) | Wrapper — calls the VPS script over SSH, adds local backup/download support |

## Quick Start

### From your local machine

```bash
cd scripts

# Make executable
chmod +x kube-db-local.sh

# Check cluster & database status
./kube-db-local.sh status

# Backup to VPS
./kube-db-local.sh backup vps

# Backup directly to your local machine
./kube-db-local.sh backup local

# Backup to both VPS and local
./kube-db-local.sh backup both

# List all backups (VPS + local)
./kube-db-local.sh list

# Restore from latest VPS backup
./kube-db-local.sh restore latest

# Restore from a local .sql file
./kube-db-local.sh restore backups/my_backup.sql

# Full platform reset (backup → wipe → fresh schema)
./kube-db-local.sh reset
```

### Directly on the VPS

```bash
ssh alexandredfm

# Backup
~/kube-db-manager.sh backup

# Restore from latest
~/kube-db-manager.sh restore latest

# Restore from specific file
~/kube-db-manager.sh restore pool_tracker_prod_20260308_204926.sql

# Full reset
~/kube-db-manager.sh reset

# Compare two backups
~/kube-db-manager.sh diff backup_old.sql backup_new.sql
```

## Commands Reference

### `kube-db-local.sh` (local machine)

| Command | Description |
|---------|-------------|
| `backup vps` | Save backup on the VPS (default) |
| `backup local` | Stream backup directly to `./backups/` on your machine |
| `backup both` | Save on VPS **and** download locally |
| `restore` | Interactive — choose VPS or local file |
| `restore latest` | Restore from the latest VPS backup |
| `restore <file.sql>` | Restore from a local `.sql` file (streamed to the pod) |
| `download [file\|latest]` | Copy a VPS backup to local `./backups/` via SCP |
| `upload <file.sql>` | Push a local backup file to the VPS |
| `list [all\|vps\|local]` | List backups (default: all) |
| `status` | K8s pod status, DB table info, backup stats |
| `reset` | Full platform reset (interactive, requires `RESET` confirmation) |
| `diff <a> <b>` | Compare two VPS backups (schema + row counts) |
| `clean [days]` | Remove VPS backups older than N days (default: 30) |
| `help` | Show help |

### `kube-db-manager.sh` (on VPS)

| Command | Description |
|---------|-------------|
| `backup` | Dump DB to a timestamped `.sql` in `~/pooltracker-backups/` |
| `backup --stdout` | Stream dump to stdout (used internally by local wrapper) |
| `restore [file\|latest]` | Restore from a VPS backup file |
| `restore --stdin` | Read SQL from stdin (used internally by local wrapper) |
| `reset` | Backup → DROP → CREATE → re-run init SQL |
| `list` | List VPS backups |
| `status` | Pod, PVC, DB table stats |
| `diff <a> <b>` | Compare two backup files |
| `clean [days]` | Remove old backups |

## How It Works

### Backup flow

```
┌──────────────┐    SSH     ┌──────────────┐   kubectl exec   ┌───────────┐
│  Local Mac   │ ────────── │     VPS      │ ──────────────── │  MySQL    │
│              │            │              │                   │  Pod      │
│  kube-db-    │  command   │  kube-db-    │   mysqldump       │           │
│  local.sh    │ ─────────► │  manager.sh  │ ◄─────────────── │  K8s      │
│              │            │              │    SQL stream      │           │
│  ./backups/  │ ◄───────── │  ~/pool...   │                   │           │
│  (if local)  │  SQL data  │  backups/    │                   │           │
└──────────────┘            └──────────────┘                   └───────────┘
```

**VPS backup** (`backup vps`):
1. Finds the running DB pod dynamically
2. Reads the MySQL root password from the pod's environment variables
3. Runs `mysqldump --single-transaction` inside the pod via `kubectl exec`
4. Saves the output to `~/pooltracker-backups/` on the VPS
5. Auto-rotates, keeping the 20 most recent backups

**Local backup** (`backup local`):
1. Same as above, but uses `--stdout` flag
2. The SQL dump streams through SSH directly to `./backups/` on your machine
3. Never touches disk on the VPS

### Restore flow

**From VPS backup** (`restore latest`):
1. Reads the `.sql` file from VPS disk
2. Pipes it into the MySQL pod via `kubectl exec -i`

**From local file** (`restore myfile.sql`):
1. Reads the `.sql` from your machine
2. Streams through SSH into `kube-db-manager.sh restore --stdin`
3. Which pipes it into the MySQL pod via `kubectl exec -i`

### Reset flow

1. Creates a safety backup first
2. `DROP DATABASE` + `CREATE DATABASE` (fresh, empty)
3. Re-runs `/docker-entrypoint-initdb.d/01-init-production.sql` from the configmap mount
4. Result: a clean platform with the default schema and admin user

## Backup Directory Layout

### On VPS (`~/pooltracker-backups/`)
```
pooltracker-backups/
├── pool_tracker_prod_20260308_204926.sql
├── pool_tracker_prod_20260310_120000.sql
├── pool_tracker_prod_20260312_090000.sql
└── pool_tracker_prod_latest.sql → pool_tracker_prod_20260312_090000.sql
```

### On local machine (`./backups/`)
```
backups/
├── pool_tracker_prod_local_20260308_210000.sql
├── pool_tracker_prod_local_20260310_150000.sql
└── pool_tracker_prod_local_latest.sql → pool_tracker_prod_local_20260310_150000.sql
```

## Configuration

### SSH host

By default the local wrapper connects to the SSH host alias `alexandredfm`. Override with:

```bash
POOLTRACKER_SSH_HOST=myuser@my-vps.com ./scripts/kube-db-local.sh backup local
```

Or set it in your shell profile:

```bash
export POOLTRACKER_SSH_HOST=alexandredfm
```

### VPS script location

The remote script is expected at `$HOME/kube-db-manager.sh` on the VPS. To update it:

```bash
scp scripts/kube-db-manager.sh alexandredfm:~/kube-db-manager.sh
```

### Kubernetes configuration

These values are configured at the top of `kube-db-manager.sh`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NAMESPACE` | `pool-tracker-prod` | K8s namespace |
| `DB_DEPLOYMENT` | `pool-tracker-db-deployment-prod` | Deployment name prefix for pod lookup |
| `DB_NAME` | `pool_tracker_prod` | MySQL database name |
| `DB_USER` | `root` | MySQL user for dumps |
| `MAX_BACKUPS` | `20` | Auto-rotate threshold |
| `BACKUP_DIR` | `$HOME/pooltracker-backups` | VPS backup directory |

## Automated Backups (Cron)

On the VPS:

```bash
# Edit crontab
sudo crontab -e

# Daily backup at 3 AM
0 3 * * * /home/ubuntu/kube-db-manager.sh backup >> /home/ubuntu/pooltracker-backups/cron.log 2>&1

# Weekly cleanup (keep 30 days)
0 4 * * 0 /home/ubuntu/kube-db-manager.sh clean 30 >> /home/ubuntu/pooltracker-backups/cron.log 2>&1
```

## Typical Scenarios

### Before a major release
```bash
# Save a safety backup both on VPS and locally
./scripts/kube-db-local.sh backup both
```

### Roll back to a previous state
```bash
# List available backups
./scripts/kube-db-local.sh list

# Restore a specific one
./scripts/kube-db-local.sh restore backups/pool_tracker_prod_local_20260308_210000.sql
```

### Fresh start for a new pool session
```bash
# Full reset: backup current state, wipe, re-init
./scripts/kube-db-local.sh reset
```

### Compare what changed between two backups
```bash
ssh alexandredfm "~/kube-db-manager.sh diff pool_tracker_prod_20260308_204926.sql pool_tracker_prod_20260310_120000.sql"
```

### Transfer a backup between VPS and local
```bash
# Download from VPS
./scripts/kube-db-local.sh download latest

# Upload to VPS
./scripts/kube-db-local.sh upload backups/my_backup.sql
```

## Troubleshooting

### "No running DB pod found"
```bash
# Check pod status
ssh alexandredfm "sudo kubectl get pods -n pool-tracker-prod"

# If the pod is CrashLooping, check logs
ssh alexandredfm "sudo kubectl logs -n pool-tracker-prod <pod-name>"
```

### "Permission denied" on kubectl
The script uses `sudo kubectl` by default (required for k3s). If your VPS has kubectl configured for the user directly, edit the `KUBECTL` variable in `kube-db-manager.sh`.

### SSH connection issues
```bash
# Verify SSH access
ssh alexandredfm "echo ok"

# Check your SSH config (~/.ssh/config)
Host alexandredfm
    HostName <your-vps-ip>
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
```

### Backup file is empty or truncated
```bash
# Verify the DB is accessible
ssh alexandredfm "~/kube-db-manager.sh status"

# Try a manual dump to check for errors
ssh alexandredfm "sudo kubectl exec <pod> -n pool-tracker-prod -- /usr/bin/mysqldump --version"
```
