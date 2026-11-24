#!/bin/bash

# PoolTracker Database Manager — Local Wrapper
# Run this from your local machine (e.g. macOS) to manage the production
# database on the remote VPS via SSH.
#
# It wraps the kube-db-manager.sh script deployed on the VPS and adds the
# ability to save/restore backups on the LOCAL filesystem.

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
SSH_HOST="${POOLTRACKER_SSH_HOST:-alexandredfm}"
REMOTE_SCRIPT="\$HOME/kube-db-manager.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOCAL_BACKUP_DIR="$PROJECT_ROOT/backups"

DB_NAME="pool_tracker_prod"

# ── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}      $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
err()     { echo -e "${RED}[ERROR]${NC}   $*"; }
header()  { echo -e "\n${PURPLE}═══════════════════════════════════════════════${NC}"; echo -e "${PURPLE}  $*${NC}"; echo -e "${PURPLE}═══════════════════════════════════════════════${NC}"; }

remote() {
    ssh "$SSH_HOST" "$REMOTE_SCRIPT $*"
}

remote_tty() {
    ssh -t "$SSH_HOST" "$REMOTE_SCRIPT $*"
}

# ── BACKUP ───────────────────────────────────────────────────────────────────
cmd_backup() {
    local dest="${1:-vps}"

    case "$dest" in
        vps|remote)
            header "Backup → VPS"
            remote backup
            ;;
        local)
            header "Backup → Local Machine"
            mkdir -p "$LOCAL_BACKUP_DIR"

            local timestamp
            timestamp=$(date +"%Y%m%d_%H%M%S")
            local filename="${DB_NAME}_local_${timestamp}.sql"
            local filepath="$LOCAL_BACKUP_DIR/$filename"

            info "Streaming backup from VPS to $filepath ..."
            ssh "$SSH_HOST" "$REMOTE_SCRIPT backup --stdout" > "$filepath"

            local size
            size=$(du -h "$filepath" | awk '{print $1}')
            ok "Backup saved locally: $filepath ($size)"

            # Update latest symlink
            ln -sf "$filepath" "$LOCAL_BACKUP_DIR/${DB_NAME}_local_latest.sql"
            info "Latest symlink updated → $filename"
            ;;
        both)
            header "Backup → VPS + Local"
            info "Step 1: Saving on VPS..."
            remote backup
            echo ""
            info "Step 2: Downloading to local..."
            cmd_backup local
            ;;
        *)
            err "Unknown destination: $dest (use 'vps', 'local', or 'both')"
            exit 1
            ;;
    esac
}

# ── RESTORE ──────────────────────────────────────────────────────────────────
cmd_restore() {
    local source="${1:-}"

    if [[ -z "$source" ]]; then
        header "Restore — Choose Source"
        echo ""
        echo -e "  ${CYAN}1)${NC} Restore from a VPS backup      (interactive)"
        echo -e "  ${CYAN}2)${NC} Restore from a local .sql file"
        echo ""
        echo -n "Choice [1/2]: "
        read -r choice
        case "$choice" in
            1) remote_tty restore; return ;;
            2)
                echo -n "Path to local .sql file: "
                read -r source
                ;;
            *) err "Invalid choice"; exit 1 ;;
        esac
    fi

    # If source is "latest" or a VPS filename, delegate to remote
    if [[ "$source" == "latest" ]] || [[ "$source" == "vps" ]]; then
        remote_tty restore latest
        return
    fi

    # Resolve local file
    local filepath="$source"
    if [[ ! -f "$filepath" ]]; then
        filepath="$LOCAL_BACKUP_DIR/$source"
    fi
    if [[ ! -f "$filepath" ]]; then
        err "File not found: $source"
        exit 1
    fi

    local realpath
    realpath=$(realpath "$filepath" 2>/dev/null || echo "$filepath")
    local size
    size=$(du -h "$realpath" | awk '{print $1}')

    header "Restore from Local File"
    warn "You are about to OVERWRITE the production database!"
    warn "  File: $(basename "$realpath") ($size)"
    echo ""
    echo -n "Type 'YES' to confirm: "
    read -r confirm
    if [[ "$confirm" != "YES" ]]; then
        info "Restore cancelled."
        return 0
    fi

    info "Streaming local SQL to VPS → K8s pod ..."
    cat "$realpath" | ssh "$SSH_HOST" "$REMOTE_SCRIPT restore --stdin"
    ok "Restore complete!"
}

# ── LIST ─────────────────────────────────────────────────────────────────────
cmd_list() {
    local location="${1:-all}"

    if [[ "$location" == "all" || "$location" == "vps" ]]; then
        remote list
    fi

    if [[ "$location" == "all" || "$location" == "local" ]]; then
        echo ""
        header "Local Backups"
        info "Directory: $LOCAL_BACKUP_DIR"
        echo ""

        if [[ ! -d "$LOCAL_BACKUP_DIR" ]]; then
            warn "No local backup directory yet."
            return 0
        fi

        local count=0
        while IFS= read -r file; do
            [[ -L "$file" ]] && continue
            local fname
            fname=$(basename "$file")
            local fsize
            fsize=$(du -h "$file" | awk '{print $1}')
            local fdate
            fdate=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d. -f1 || echo "unknown")

            echo -e "  ${CYAN}$fname${NC}  ($fsize)  $fdate"
            count=$((count + 1))
        done < <(find "$LOCAL_BACKUP_DIR" -maxdepth 1 -name "*.sql" -type f | sort -r)

        if [[ $count -eq 0 ]]; then
            warn "No local backups found."
        else
            echo ""
            info "$count local backup(s)"
        fi

        local latest="$LOCAL_BACKUP_DIR/${DB_NAME}_local_latest.sql"
        if [[ -L "$latest" ]]; then
            local target
            target=$(readlink "$latest")
            echo -e "\n  ${GREEN}latest →${NC} $(basename "$target")"
        fi
    fi
}

# ── PASS-THROUGH commands to VPS ─────────────────────────────────────────────
cmd_status() { remote status; }
cmd_diff()   { remote "diff $*"; }
cmd_clean()  { remote "clean ${1:-30}"; }
cmd_reset()  { remote_tty reset; }

# ── DOWNLOAD: fetch a VPS backup to local ────────────────────────────────────
cmd_download() {
    local target="${1:-latest}"

    header "Download VPS Backup → Local"

    mkdir -p "$LOCAL_BACKUP_DIR"

    if [[ "$target" == "latest" ]]; then
        target="${DB_NAME}_latest.sql"
    fi

    local remote_path="\$HOME/pooltracker-backups/$target"
    local local_file="$LOCAL_BACKUP_DIR/$target"

    info "Downloading $target ..."
    scp "$SSH_HOST:pooltracker-backups/$target" "$local_file"

    local size
    size=$(du -h "$local_file" | awk '{print $1}')
    ok "Downloaded: $local_file ($size)"
}

# ── UPLOAD: push a local backup to VPS ───────────────────────────────────────
cmd_upload() {
    local source="${1:-}"

    if [[ -z "$source" ]]; then
        err "Usage: $0 upload <file.sql>"
        exit 1
    fi

    local filepath="$source"
    [[ ! -f "$filepath" ]] && filepath="$LOCAL_BACKUP_DIR/$source"
    if [[ ! -f "$filepath" ]]; then
        err "File not found: $source"
        exit 1
    fi

    header "Upload Local Backup → VPS"

    local fname
    fname=$(basename "$filepath")
    info "Uploading $fname ..."
    scp "$filepath" "$SSH_HOST:pooltracker-backups/$fname"

    ok "Uploaded to VPS: ~/pooltracker-backups/$fname"
}

# ── HELP ─────────────────────────────────────────────────────────────────────
cmd_help() {
    header "PoolTracker DB Manager — Local Client"
    echo ""
    echo -e "${CYAN}USAGE:${NC}"
    echo "  $0 <command> [options]"
    echo ""
    echo -e "${CYAN}BACKUP & RESTORE:${NC}"
    echo -e "  ${GREEN}backup vps${NC}              Save backup on VPS only (default)"
    echo -e "  ${GREEN}backup local${NC}            Download backup directly to local machine"
    echo -e "  ${GREEN}backup both${NC}             Save on VPS + download locally"
    echo -e "  ${GREEN}restore${NC}                 Interactive restore (choose VPS or local file)"
    echo -e "  ${GREEN}restore latest${NC}          Restore from latest VPS backup"
    echo -e "  ${GREEN}restore <file.sql>${NC}      Restore from a local .sql file"
    echo ""
    echo -e "${CYAN}TRANSFER:${NC}"
    echo -e "  ${GREEN}download${NC} [file|latest]  Download a VPS backup to local machine"
    echo -e "  ${GREEN}upload${NC} <file.sql>       Upload a local backup to VPS"
    echo ""
    echo -e "${CYAN}MANAGEMENT:${NC}"
    echo -e "  ${GREEN}list${NC} [all|vps|local]    List backups (default: all)"
    echo -e "  ${GREEN}status${NC}                  Show K8s DB status"
    echo -e "  ${GREEN}reset${NC}                   Full platform reset (backup → wipe → re-init)"
    echo -e "  ${GREEN}diff${NC} <file1> <file2>    Compare two VPS backups"
    echo -e "  ${GREEN}clean${NC} [days]            Remove old VPS backups (default: 30 days)"
    echo -e "  ${GREEN}help${NC}                    Show this help"
    echo ""
    echo -e "${CYAN}EXAMPLES:${NC}"
    echo "  $0 backup local                # Download a fresh backup to ./backups/"
    echo "  $0 backup both                 # Backup on VPS + local"
    echo "  $0 restore backups/old.sql     # Restore from a local file"
    echo "  $0 download latest             # Fetch latest VPS backup"
    echo "  $0 list local                  # List only local backups"
    echo ""
    echo -e "${CYAN}CONFIGURATION:${NC}"
    echo "  SSH host          : $SSH_HOST  (override with POOLTRACKER_SSH_HOST)"
    echo "  Local backup dir  : $LOCAL_BACKUP_DIR"
    echo "  Remote script     : $REMOTE_SCRIPT"
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
    local command="${1:-help}"
    shift || true

    case "$command" in
        backup)      cmd_backup "${1:-vps}" ;;
        restore)     cmd_restore "$@" ;;
        reset)       cmd_reset ;;
        list)        cmd_list "${1:-all}" ;;
        status)      cmd_status ;;
        diff)        cmd_diff "$@" ;;
        clean)       cmd_clean "$@" ;;
        download)    cmd_download "${1:-latest}" ;;
        upload)      cmd_upload "$@" ;;
        help|--help|-h) cmd_help ;;
        *)
            err "Unknown command: $command"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
