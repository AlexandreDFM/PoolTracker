#!/bin/bash

# PoolTracker Kubernetes Database Backup & Restore Manager
# Runs on the VPS to backup/restore the MySQL database inside the K8s cluster.
# Backups are stored on the VPS filesystem with timestamped filenames.

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Configuration ────────────────────────────────────────────────────────────
# Preprod: NAMESPACE=pool-tracker-preprod DB_NAME=pool_tracker_preprod
NAMESPACE="${NAMESPACE:-pool-tracker-prod}"
DB_DEPLOYMENT="pool-tracker-db"
DB_SELECTOR="app.kubernetes.io/name=pool-tracker,app.kubernetes.io/component=database"
APP_DEPLOYMENT="pool-tracker-web"
DB_NAME="${DB_NAME:-pool_tracker_prod}"
DB_USER="root"
BACKUP_DIR="$HOME/pooltracker-backups"
KUBECTL="sudo kubectl"
MYSQLDUMP_BIN="/usr/bin/mysqldump"
MYSQL_BIN="/usr/bin/mysql"
MAX_BACKUPS=20  # Keep the N most recent backups

# ── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}      $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
err()     { echo -e "${RED}[ERROR]${NC}   $*"; }
header()  { echo -e "\n${PURPLE}═══════════════════════════════════════════════${NC}"; echo -e "${PURPLE}  $*${NC}"; echo -e "${PURPLE}═══════════════════════════════════════════════${NC}"; }

# ── Resolve the running DB pod ───────────────────────────────────────────────
get_db_pod() {
    local pod
    pod=$($KUBECTL get pods -n "$NAMESPACE" \
        -l "$DB_SELECTOR" \
        -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' 2>/dev/null)

    if [[ -z "$pod" ]]; then
        # Fallback: find by deployment prefix
        pod=$($KUBECTL get pods -n "$NAMESPACE" \
            --field-selector=status.phase=Running \
            -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null \
            | grep "^${DB_DEPLOYMENT}" | head -1)
    fi

    if [[ -z "$pod" ]]; then
        err "No running DB pod found in namespace $NAMESPACE"
        exit 1
    fi
    echo "$pod"
}

# ── Get the DB password from the pod env ─────────────────────────────────────
get_db_password() {
    local pod="$1"
    $KUBECTL exec "$pod" -n "$NAMESPACE" -- \
        sh -c 'echo "$MYSQL_ROOT_PASSWORD"' 2>/dev/null
}

# ── Exec helper (suppresses mysql warnings) ─────────────────────────────────
kube_exec() {
    local pod="$1"; shift
    $KUBECTL exec "$pod" -n "$NAMESPACE" -- "$@" 2>/dev/null
}

# ── BACKUP ───────────────────────────────────────────────────────────────────
cmd_backup() {
    local to_stdout=false
    if [[ "${1:-}" == "--stdout" ]]; then
        to_stdout=true
    fi

    # When streaming to stdout, all info messages go to stderr
    if $to_stdout; then
        exec 3>&2  # info channel = stderr
    else
        exec 3>&1  # info channel = stdout
    fi

    header "Kubernetes DB Backup" >&3

    mkdir -p "$BACKUP_DIR"

    local pod
    pod=$(get_db_pod)
    info "DB pod: $pod" >&3

    local password
    password=$(get_db_password "$pod")
    if [[ -z "$password" ]]; then
        err "Could not retrieve DB password from pod" >&2
        exit 1
    fi

    # Verify connectivity
    info "Verifying database connection..." >&3
    if ! kube_exec "$pod" "$MYSQL_BIN" -u "$DB_USER" -p"$password" -e "SELECT 1;" >/dev/null; then
        err "Cannot connect to MySQL inside the pod" >&2
        exit 1
    fi
    ok "Database connection OK" >&3

    # Table/row counts summary
    info "Database snapshot:" >&3
    kube_exec "$pod" "$MYSQL_BIN" -u "$DB_USER" -p"$password" "$DB_NAME" \
        -e "SELECT table_name AS 'Table', table_rows AS 'Rows', ROUND((data_length+index_length)/1024,1) AS 'Size_KB' FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY table_name;" >&3 2>/dev/null || true

    if $to_stdout; then
        # Stream the dump directly to stdout (caller captures it)
        info "Streaming dump to stdout..." >&3
        kube_exec "$pod" "$MYSQLDUMP_BIN" \
            -u "$DB_USER" \
            -p"$password" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --add-drop-database \
            --create-options \
            --extended-insert \
            --quick \
            --lock-tables=false \
            --databases "$DB_NAME"
        ok "Dump streamed successfully" >&3
    else
        local timestamp
        timestamp=$(date +"%Y%m%d_%H%M%S")
        local filename="${DB_NAME}_${timestamp}.sql"
        local filepath="$BACKUP_DIR/$filename"

        info "Dumping $DB_NAME → $filepath ..."

        kube_exec "$pod" "$MYSQLDUMP_BIN" \
            -u "$DB_USER" \
            -p"$password" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --add-drop-database \
            --create-options \
            --extended-insert \
            --quick \
            --lock-tables=false \
            --databases "$DB_NAME" > "$filepath"

        local size
        size=$(du -h "$filepath" | cut -f1)
        ok "Backup complete: $filepath ($size)"

        # Maintain "latest" symlink
        ln -sf "$filepath" "$BACKUP_DIR/${DB_NAME}_latest.sql"
        info "Latest symlink updated → $filename"

        # Auto-rotate old backups
        _rotate_backups
    fi
}

# ── RESTORE ──────────────────────────────────────────────────────────────────
cmd_restore() {
    local target="${1:-}"

    header "Kubernetes DB Restore"

    # --stdin mode: SQL is piped from the caller (used by the local wrapper)
    if [[ "$target" == "--stdin" ]]; then
        local pod
        pod=$(get_db_pod)
        info "DB pod: $pod"
        local password
        password=$(get_db_password "$pod")

        info "Receiving SQL from stdin and piping into pod..."
        $KUBECTL exec -i "$pod" -n "$NAMESPACE" -- \
            "$MYSQL_BIN" -u "$DB_USER" -p"$password" 2>/dev/null

        ok "Database restored successfully from stdin"

        info "Post-restore table overview:"
        kube_exec "$pod" "$MYSQL_BIN" -u "$DB_USER" -p"$password" "$DB_NAME" \
            -e "SELECT table_name AS 'Table', table_rows AS 'Rows' FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY table_name;" 2>/dev/null || true
        return 0
    fi

    # Determine which file to restore
    local filepath=""
    if [[ -z "$target" ]]; then
        # Interactive: show list and prompt
        cmd_list
        echo ""
        echo -n "Enter backup filename (or 'latest'): "
        read -r target
    fi

    if [[ "$target" == "latest" ]]; then
        filepath="$BACKUP_DIR/${DB_NAME}_latest.sql"
        if [[ ! -L "$filepath" && ! -f "$filepath" ]]; then
            err "No 'latest' backup found"
            exit 1
        fi
    elif [[ -f "$target" ]]; then
        filepath="$target"
    elif [[ -f "$BACKUP_DIR/$target" ]]; then
        filepath="$BACKUP_DIR/$target"
    else
        err "Backup file not found: $target"
        exit 1
    fi

    local realpath
    realpath=$(readlink -f "$filepath" 2>/dev/null || echo "$filepath")
    local size
    size=$(du -h "$realpath" | cut -f1)

    warn "You are about to OVERWRITE the production database!"
    warn "  Database : $DB_NAME"
    warn "  Namespace: $NAMESPACE"
    warn "  File     : $(basename "$realpath") ($size)"
    echo ""
    echo -n "Type 'YES' to confirm: "
    read -r confirm
    if [[ "$confirm" != "YES" ]]; then
        info "Restore cancelled."
        return 0
    fi

    local pod
    pod=$(get_db_pod)
    info "DB pod: $pod"

    local password
    password=$(get_db_password "$pod")

    info "Piping SQL into pod..."
    $KUBECTL exec -i "$pod" -n "$NAMESPACE" -- \
        "$MYSQL_BIN" -u "$DB_USER" -p"$password" < "$realpath" 2>/dev/null

    ok "Database restored successfully from $(basename "$realpath")"

    # Show post-restore summary
    info "Post-restore table overview:"
    kube_exec "$pod" "$MYSQL_BIN" -u "$DB_USER" -p"$password" "$DB_NAME" \
        -e "SELECT table_name AS 'Table', table_rows AS 'Rows' FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY table_name;" 2>/dev/null || true
}

# ── RESET (backup + wipe + re-init) ─────────────────────────────────────────
cmd_reset() {
    header "Kubernetes DB RESET (full platform reset)"

    warn "This will:"
    warn "  1. Backup the current database"
    warn "  2. DROP all tables"
    warn "  3. Restart the application, which creates a fresh schema and a new admin account"
    echo ""
    echo -n "Type 'RESET' to confirm: "
    read -r confirm
    if [[ "$confirm" != "RESET" ]]; then
        info "Reset cancelled."
        return 0
    fi

    # Step 1: backup first
    info "Step 1/3 — Creating safety backup..."
    cmd_backup

    local pod
    pod=$(get_db_pod)
    local password
    password=$(get_db_password "$pod")

    # Step 2: drop and recreate the database
    info "Step 2/3 — Dropping and recreating database..."
    kube_exec "$pod" "$MYSQL_BIN" -u "$DB_USER" -p"$password" \
        -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    ok "Database $DB_NAME recreated (empty)"

    # Step 3: the application creates its schema on startup (server/config/database.js)
    info "Step 3/3 — Restarting the application to recreate the schema..."
    $KUBECTL rollout restart deployment/"$APP_DEPLOYMENT" -n "$NAMESPACE"
    $KUBECTL rollout status deployment/"$APP_DEPLOYMENT" -n "$NAMESPACE" --timeout=300s
    ok "Application restarted"
    info "The new admin password is printed once in the application logs:"
    info "  $KUBECTL logs deployment/$APP_DEPLOYMENT -n $NAMESPACE | grep 'Default admin'"

    ok "Platform reset complete. A pre-reset backup has been saved."
}

# ── LIST backups ─────────────────────────────────────────────────────────────
cmd_list() {
    header "Available Backups"
    info "Directory: $BACKUP_DIR"
    echo ""

    if [[ ! -d "$BACKUP_DIR" ]]; then
        warn "Backup directory does not exist yet."
        return 0
    fi

    local count=0
    while IFS= read -r file; do
        [[ -L "$file" ]] && continue  # skip symlinks
        local fname
        fname=$(basename "$file")
        local fsize
        fsize=$(du -h "$file" | cut -f1)
        local fdate
        fdate=$(stat -c "%y" "$file" 2>/dev/null | cut -d. -f1)
        if [[ -z "$fdate" ]]; then
            fdate=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || echo "unknown")
        fi

        echo -e "  ${CYAN}$fname${NC}  ($fsize)  $fdate"
        count=$((count + 1))
    done < <(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql" -type f | sort -r)

    if [[ $count -eq 0 ]]; then
        warn "No backups found."
    else
        echo ""
        info "$count backup(s) total"
    fi

    # Show latest symlink target
    local latest="$BACKUP_DIR/${DB_NAME}_latest.sql"
    if [[ -L "$latest" ]]; then
        local target
        target=$(readlink "$latest")
        echo -e "\n  ${GREEN}latest →${NC} $(basename "$target")"
    fi
}

# ── STATUS ───────────────────────────────────────────────────────────────────
cmd_status() {
    header "Kubernetes DB Status"

    info "Namespace: $NAMESPACE"

    # Pod status
    echo ""
    info "Pod status:"
    $KUBECTL get pods -n "$NAMESPACE" -l "$DB_SELECTOR" -o wide 2>/dev/null || \
    $KUBECTL get pods -n "$NAMESPACE" 2>/dev/null | grep "$DB_DEPLOYMENT" || true

    # PVC status
    echo ""
    info "Persistent volumes:"
    $KUBECTL get pvc -n "$NAMESPACE" 2>/dev/null || true

    # Try to connect and show DB info
    local pod
    pod=$(get_db_pod 2>/dev/null) || { warn "No running DB pod found"; return; }
    local password
    password=$(get_db_password "$pod")

    echo ""
    info "Database info ($DB_NAME):"
    kube_exec "$pod" "$MYSQL_BIN" -u "$DB_USER" -p"$password" "$DB_NAME" \
        -e "SELECT table_name AS 'Table', table_rows AS 'Rows', ROUND((data_length+index_length)/1024,1) AS 'Size_KB' FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY table_name;" 2>/dev/null || warn "Could not query database"

    # Backup directory info
    echo ""
    info "Backup directory: $BACKUP_DIR"
    if [[ -d "$BACKUP_DIR" ]]; then
        local bcount
        bcount=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql" -type f | wc -l)
        local bsize
        bsize=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        info "  $bcount backup(s), $bsize total"
    else
        info "  (not created yet)"
    fi
}

# ── CLEAN old backups ────────────────────────────────────────────────────────
cmd_clean() {
    local days="${1:-30}"

    header "Cleaning Backups Older Than $days Days"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        warn "No backup directory found."
        return 0
    fi

    local count=0
    while IFS= read -r -d '' file; do
        [[ -L "$file" ]] && continue
        info "Removing: $(basename "$file")"
        rm -f "$file"
        count=$((count + 1))
    done < <(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql" -type f -mtime +"$days" -print0)

    if [[ $count -eq 0 ]]; then
        ok "No old backups to remove."
    else
        ok "Removed $count old backup(s)."
    fi

    # Fix latest symlink if it's broken
    local latest="$BACKUP_DIR/${DB_NAME}_latest.sql"
    if [[ -L "$latest" && ! -e "$latest" ]]; then
        rm -f "$latest"
        # Re-point to the newest remaining backup
        local newest
        newest=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql" -type f | sort -r | head -1)
        if [[ -n "$newest" ]]; then
            ln -sf "$newest" "$latest"
            info "Latest symlink re-pointed → $(basename "$newest")"
        fi
    fi
}

# ── DIFF: compare two backups (schema or row counts) ────────────────────────
cmd_diff() {
    local file1="${1:-}"
    local file2="${2:-}"

    header "Backup Diff"

    if [[ -z "$file1" || -z "$file2" ]]; then
        err "Usage: $0 diff <backup1.sql> <backup2.sql>"
        exit 1
    fi

    # Resolve paths
    [[ ! -f "$file1" ]] && file1="$BACKUP_DIR/$file1"
    [[ ! -f "$file2" ]] && file2="$BACKUP_DIR/$file2"

    if [[ ! -f "$file1" ]]; then err "File not found: $file1"; exit 1; fi
    if [[ ! -f "$file2" ]]; then err "File not found: $file2"; exit 1; fi

    info "Comparing:"
    info "  A: $(basename "$file1")"
    info "  B: $(basename "$file2")"
    echo ""

    # Compare CREATE TABLE statements (schema diff)
    info "Schema differences:"
    diff <(grep -E '^CREATE TABLE|^  `' "$file1" || true) \
         <(grep -E '^CREATE TABLE|^  `' "$file2" || true) \
         --color=always || true

    echo ""

    # Compare INSERT row counts per table
    info "INSERT statement count per table (extended inserts, not rows):"
    echo -e "  ${CYAN}Table${NC}                           ${CYAN}A${NC}        ${CYAN}B${NC}        ${CYAN}Delta${NC}"
    echo "  ──────────────────────────────────────────────────────"

    # Extract table names and INSERT counts from each file
    for table in $(grep -ho 'INSERT INTO `[^`]*`' "$file1" "$file2" | sed -e 's/^INSERT INTO `//' -e 's/`$//' | sort -u); do
        local countA countB
        countA=$(grep -c "INSERT INTO \`$table\`" "$file1" 2>/dev/null || true)
        countB=$(grep -c "INSERT INTO \`$table\`" "$file2" 2>/dev/null || true)
        local delta=$((countB - countA))
        local color="$NC"
        [[ $delta -gt 0 ]] && color="$GREEN"
        [[ $delta -lt 0 ]] && color="$RED"
        printf "  %-35s %-10s %-10s ${color}%s${NC}\n" "$table" "$countA" "$countB" "$delta"
    done
}

# ── Rotate: keep only MAX_BACKUPS most recent ────────────────────────────────
_rotate_backups() {
    local count
    count=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql" -type f | wc -l)

    if [[ $count -gt $MAX_BACKUPS ]]; then
        local to_remove=$((count - MAX_BACKUPS))
        info "Rotating: removing $to_remove old backup(s) (keeping $MAX_BACKUPS)"
        find "$BACKUP_DIR" -maxdepth 1 -name "*.sql" -type f | sort | head -n "$to_remove" | while read -r f; do
            rm -f "$f"
            info "  Removed: $(basename "$f")"
        done
    fi
}

# ── HELP ─────────────────────────────────────────────────────────────────────
cmd_help() {
    header "PoolTracker K8s Database Manager"
    echo ""
    echo -e "${CYAN}USAGE:${NC}"
    echo "  $0 <command> [options]"
    echo ""
    echo -e "${CYAN}COMMANDS:${NC}"
    echo -e "  ${GREEN}backup${NC}                  Dump the production DB to a timestamped .sql file on VPS"
    echo -e "  ${GREEN}backup --stdout${NC}          Stream the dump to stdout (for piping to local machine)"
    echo -e "  ${GREEN}restore${NC} [file|latest]   Restore the production DB from a VPS backup file"
    echo -e "  ${GREEN}restore --stdin${NC}          Restore from SQL piped via stdin (from local machine)"
    echo -e "  ${GREEN}reset${NC}                   Full platform reset: backup → wipe → re-init schema"
    echo -e "  ${GREEN}list${NC}                    List all available backup files on VPS"
    echo -e "  ${GREEN}status${NC}                  Show K8s pod status, DB info, and backup summary"
    echo -e "  ${GREEN}diff${NC} <file1> <file2>    Compare two backup files (schema + row counts)"
    echo -e "  ${GREEN}clean${NC} [days]            Remove backups older than N days (default: 30)"
    echo -e "  ${GREEN}help${NC}                    Show this help"
    echo ""
    echo -e "${CYAN}EXAMPLES (on VPS):${NC}"
    echo "  $0 backup                                # Save backup on VPS"
    echo "  $0 restore latest                         # Restore from the latest VPS backup"
    echo "  $0 restore pool_tracker_prod_20260308.sql # Restore a specific VPS backup"
    echo "  $0 reset                                  # Full wipe & re-init (backup first)"
    echo "  $0 diff backup_old.sql backup_new.sql     # Compare two backups"
    echo "  $0 clean 60                               # Remove backups older than 60 days"
    echo ""
    echo -e "${CYAN}EXAMPLES (from local machine via SSH):${NC}"
    echo "  ssh user@vps \"$0 backup --stdout\" > backup.sql   # Download backup locally"
    echo "  cat backup.sql | ssh user@vps \"$0 restore --stdin\" # Upload & restore from local"
    echo ""
    echo -e "${CYAN}CONFIGURATION:${NC}"
    echo "  Namespace  : $NAMESPACE"
    echo "  DB name    : $DB_NAME"
    echo "  Backup dir : $BACKUP_DIR"
    echo "  Max backups: $MAX_BACKUPS"
    echo ""
    echo -e "${YELLOW}NOTE:${NC} This script must run on the VPS with kubectl access to the K8s cluster."
    echo -e "${YELLOW}      Credentials are read from the running pod's environment variables.${NC}"
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
    local command="${1:-help}"
    shift || true

    case "$command" in
        backup)      cmd_backup "$@" ;;
        restore)     cmd_restore "$@" ;;
        reset)       cmd_reset ;;
        list)        cmd_list ;;
        status)      cmd_status ;;
        diff)        cmd_diff "$@" ;;
        clean)       cmd_clean "$@" ;;
        help|--help|-h) cmd_help ;;
        *)
            err "Unknown command: $command"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
