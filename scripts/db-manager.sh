#!/bin/bash

# 🗄️ PoolTracker Database Management Script
# Provides utilities for dumping and restoring local and remote databases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Backup directory
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"

# Configuration files
ENV_FILE="$PROJECT_ROOT/.env"
ENV_PROD_FILE="$PROJECT_ROOT/.env.prod"

# Default values
DEFAULT_LOCAL_HOST="localhost"
DEFAULT_LOCAL_PORT="3306"
DEFAULT_REMOTE_PORT="3306"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to load environment variables
load_env() {
    local env_file="$1"
    if [[ -f "$env_file" ]]; then
        print_status "Loading environment from $env_file"
        set -a
        source "$env_file"
        set +a
    else
        print_error "Environment file $env_file not found!"
        exit 1
    fi
}

# Function to check if MySQL client is available
check_mysql_client() {
    if ! command -v mysql &> /dev/null && ! command -v mysqldump &> /dev/null; then
        print_error "MySQL client tools not found! Please install MySQL client:"
        echo "  macOS: brew install mysql-client"
        echo "  Ubuntu/Debian: sudo apt-get install mysql-client-core-8.0"
        echo "  CentOS/RHEL: sudo yum install mysql"
        exit 1
    fi
}

# Function to test database connection
test_connection() {
    local host="$1"
    local port="$2"
    local user="$3"
    local password="$4"
    local database="$5"

    print_status "Testing connection to $host:$port..."

    if mysql -h "$host" -P "$port" -u "$user" -p"$password" "$database" -e "SELECT 1;" &>/dev/null; then
        print_success "Connection successful!"
        return 0
    else
        print_error "Connection failed!"
        return 1
    fi
}

# Function to get database size
get_db_size() {
    local host="$1"
    local port="$2"
    local user="$3"
    local password="$4"
    local database="$5"

    local size=$(mysql -h "$host" -P "$port" -u "$user" -p"$password" "$database" -e "
        SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size in MB'
        FROM information_schema.tables
        WHERE table_schema = '$database';
    " --skip-column-names 2>/dev/null)

    echo "${size:-0} MB"
}

# Function to dump database
dump_database() {
    local env_type="$1"  # local or remote
    local host="$2"
    local port="$3"
    local user="$4"
    local password="$5"
    local database="$6"

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local dump_file="$BACKUP_DIR/${database}_${env_type}_${timestamp}.sql"

    print_header "Dumping $env_type Database: $database"

    # Test connection first
    if ! test_connection "$host" "$port" "$user" "$password" "$database"; then
        print_error "Cannot connect to database. Aborting dump."
        return 1
    fi

    # Get database size
    local db_size=$(get_db_size "$host" "$port" "$user" "$password" "$database")
    print_status "Database size: $db_size"

    print_status "Creating dump file: $dump_file"

    # Create database dump with extended options
    if mysqldump \
        --host="$host" \
        --port="$port" \
        --user="$user" \
        --password="$password" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --create-options \
        --disable-keys \
        --extended-insert \
        --quick \
        --lock-tables=false \
        --add-locks \
        --comments \
        --dump-date \
        --databases "$database" > "$dump_file"; then

        # Get file size
        local file_size=$(du -h "$dump_file" | cut -f1)
        print_success "Database dumped successfully!"
        print_success "Dump file: $dump_file ($file_size)"

        # Create a latest symlink for easy access
        local latest_link="$BACKUP_DIR/${database}_${env_type}_latest.sql"
        ln -sf "$dump_file" "$latest_link"
        print_status "Latest backup symlink: $latest_link"

        return 0
    else
        print_error "Database dump failed!"
        [[ -f "$dump_file" ]] && rm -f "$dump_file"
        return 1
    fi
}

# Function to restore database
restore_database() {
    local env_type="$1"  # local or remote
    local host="$2"
    local port="$3"
    local user="$4"
    local password="$5"
    local database="$6"
    local dump_file="$7"

    print_header "Restoring $env_type Database: $database"

    # Check if dump file exists
    if [[ ! -f "$dump_file" ]]; then
        print_error "Dump file not found: $dump_file"
        return 1
    fi

    # Test connection first
    if ! test_connection "$host" "$port" "$user" "$password" "$database"; then
        print_error "Cannot connect to database. Aborting restore."
        return 1
    fi

    # Get file size
    local file_size=$(du -h "$dump_file" | cut -f1)
    print_status "Restoring from: $dump_file ($file_size)"

    # Warning for production
    if [[ "$env_type" == "remote" ]]; then
        print_warning "⚠️  WARNING: You are about to restore to a REMOTE/PRODUCTION database!"
        print_warning "This will OVERWRITE the existing database: $database"
        echo -n "Type 'YES' to continue: "
        read -r confirmation
        if [[ "$confirmation" != "YES" ]]; then
            print_status "Restore cancelled by user."
            return 0
        fi
    fi

    print_status "Starting database restore..."

    # Restore database
    if mysql -h "$host" -P "$port" -u "$user" -p"$password" < "$dump_file"; then
        print_success "Database restored successfully!"

        # Verify restore
        local restored_size=$(get_db_size "$host" "$port" "$user" "$password" "$database")
        print_success "Restored database size: $restored_size"

        return 0
    else
        print_error "Database restore failed!"
        return 1
    fi
}

# Function to list available backups
list_backups() {
    print_header "Available Database Backups"

    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        print_warning "No backups found in $BACKUP_DIR"
        return 0
    fi

    echo -e "${CYAN}Backup Directory: $BACKUP_DIR${NC}"
    echo ""

    # List all SQL files with details
    for file in "$BACKUP_DIR"/*.sql; do
        if [[ -f "$file" && ! -L "$file" ]]; then
            local filename=$(basename "$file")
            local size=$(du -h "$file" | cut -f1)
            local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d. -f1)

            if [[ "$filename" == *"_local_"* ]]; then
                echo -e "${GREEN}📁 LOCAL:${NC}  $filename ($size) - $date"
            elif [[ "$filename" == *"_remote_"* ]]; then
                echo -e "${RED}🌐 REMOTE:${NC} $filename ($size) - $date"
            else
                echo -e "${YELLOW}❓ OTHER:${NC} $filename ($size) - $date"
            fi
        fi
    done

    echo ""

    # List symlinks (latest backups)
    echo -e "${PURPLE}Latest Backup Links:${NC}"
    for link in "$BACKUP_DIR"/*_latest.sql; do
        if [[ -L "$link" ]]; then
            local linkname=$(basename "$link")
            local target=$(readlink "$link")
            local targetname=$(basename "$target")
            echo -e "${CYAN}🔗 $linkname${NC} → $targetname"
        fi
    done
}

# Function to clean old backups
clean_backups() {
    local days=${1:-7}  # Default: keep backups for 7 days

    print_header "Cleaning Old Backups (older than $days days)"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_warning "No backup directory found."
        return 0
    fi

    local count=0
    while IFS= read -r -d '' file; do
        local filename=$(basename "$file")
        print_status "Removing old backup: $filename"
        rm -f "$file"
        ((count++))
    done < <(find "$BACKUP_DIR" -name "*.sql" -type f -mtime +"$days" -print0)

    if [[ $count -eq 0 ]]; then
        print_success "No old backups to clean."
    else
        print_success "Cleaned $count old backup(s)."
    fi
}

# Function to dump local database
dump_local() {
    print_header "Dumping Local Database"

    # Load local environment
    load_env "$ENV_FILE"

    local host="${DB_HOST:-$DEFAULT_LOCAL_HOST}"
    local port="${DB_PORT:-$MYSQL_PORT:-$DEFAULT_LOCAL_PORT}"
    local user="${DB_USER:-$MYSQL_USER}"
    local password="${DB_PASSWORD:-$MYSQL_PASSWORD}"
    local database="${DB_NAME:-$MYSQL_DATABASE}"

    # Validate required variables
    if [[ -z "$user" || -z "$password" || -z "$database" ]]; then
        print_error "Missing required database configuration in $ENV_FILE"
        print_error "Required: DB_USER (or MYSQL_USER), DB_PASSWORD (or MYSQL_PASSWORD), DB_NAME (or MYSQL_DATABASE)"
        return 1
    fi

    dump_database "local" "$host" "$port" "$user" "$password" "$database"
}

# Function to dump remote database
dump_remote() {
    print_header "Dumping Remote/Production Database"

    # Load production environment
    load_env "$ENV_PROD_FILE"

    # For remote, we might need different connection details
    # These should be set in .env.prod or passed as parameters
    local host="${REMOTE_DB_HOST:-$DB_HOST}"
    local port="${REMOTE_DB_PORT:-$DB_PORT:-$MYSQL_PORT:-$DEFAULT_REMOTE_PORT}"
    local user="${REMOTE_DB_USER:-$DB_USER:-$MYSQL_USER}"
    local password="${REMOTE_DB_PASSWORD:-$DB_PASSWORD:-$MYSQL_PASSWORD}"
    local database="${REMOTE_DB_NAME:-$DB_NAME:-$MYSQL_DATABASE}"

    # Validate required variables
    if [[ -z "$host" || -z "$user" || -z "$password" || -z "$database" ]]; then
        print_error "Missing required remote database configuration in $ENV_PROD_FILE"
        print_error "Required: REMOTE_DB_HOST (or DB_HOST), REMOTE_DB_USER (or DB_USER), REMOTE_DB_PASSWORD (or DB_PASSWORD), REMOTE_DB_NAME (or DB_NAME)"
        print_warning "For remote connections, consider adding REMOTE_DB_* variables to your .env.prod file"
        return 1
    fi

    print_warning "⚠️  Connecting to REMOTE database: $host:$port"

    dump_database "remote" "$host" "$port" "$user" "$password" "$database"
}

# Function to restore local database
restore_local() {
    local dump_file="$1"

    print_header "Restoring Local Database"

    # If no file specified, use the latest local backup
    if [[ -z "$dump_file" ]]; then
        dump_file="$BACKUP_DIR/$(ls -t "$BACKUP_DIR"/*_local_*.sql 2>/dev/null | head -1 | xargs basename 2>/dev/null)"
        if [[ ! -f "$BACKUP_DIR/$dump_file" ]]; then
            dump_file="$BACKUP_DIR/*_local_latest.sql"
            dump_file=$(echo $dump_file)  # Expand glob
        fi
    fi

    # Make path absolute if relative
    if [[ "$dump_file" != /* ]]; then
        dump_file="$BACKUP_DIR/$dump_file"
    fi

    # Load local environment
    load_env "$ENV_FILE"

    local host="${DB_HOST:-$DEFAULT_LOCAL_HOST}"
    local port="${DB_PORT:-$MYSQL_PORT:-$DEFAULT_LOCAL_PORT}"
    local user="${DB_USER:-$MYSQL_USER}"
    local password="${DB_PASSWORD:-$MYSQL_PASSWORD}"
    local database="${DB_NAME:-$MYSQL_DATABASE}"

    # Validate required variables
    if [[ -z "$user" || -z "$password" || -z "$database" ]]; then
        print_error "Missing required database configuration in $ENV_FILE"
        return 1
    fi

    restore_database "local" "$host" "$port" "$user" "$password" "$database" "$dump_file"
}

# Function to restore remote database
restore_remote() {
    local dump_file="$1"

    print_header "Restoring Remote/Production Database"

    # If no file specified, show error (too dangerous for remote)
    if [[ -z "$dump_file" ]]; then
        print_error "You must specify a dump file for remote restore!"
        print_status "Available backups:"
        list_backups
        return 1
    fi

    # Make path absolute if relative
    if [[ "$dump_file" != /* ]]; then
        dump_file="$BACKUP_DIR/$dump_file"
    fi

    # Load production environment
    load_env "$ENV_PROD_FILE"

    local host="${REMOTE_DB_HOST:-$DB_HOST}"
    local port="${REMOTE_DB_PORT:-$DB_PORT:-$MYSQL_PORT:-$DEFAULT_REMOTE_PORT}"
    local user="${REMOTE_DB_USER:-$DB_USER:-$MYSQL_USER}"
    local password="${REMOTE_DB_PASSWORD:-$DB_PASSWORD:-$MYSQL_PASSWORD}"
    local database="${REMOTE_DB_NAME:-$DB_NAME:-$MYSQL_DATABASE}"

    # Validate required variables
    if [[ -z "$host" || -z "$user" || -z "$password" || -z "$database" ]]; then
        print_error "Missing required remote database configuration in $ENV_PROD_FILE"
        return 1
    fi

    print_warning "⚠️  DANGER: Restoring to REMOTE database: $host:$port"

    restore_database "remote" "$host" "$port" "$user" "$password" "$database" "$dump_file"
}

# Function to show database status
show_status() {
    print_header "Database Status"

    echo -e "${CYAN}Local Database:${NC}"
    load_env "$ENV_FILE" 2>/dev/null || true
    local local_host="${DB_HOST:-$DEFAULT_LOCAL_HOST}"
    local local_port="${DB_PORT:-$MYSQL_PORT:-$DEFAULT_LOCAL_PORT}"
    local local_user="${DB_USER:-$MYSQL_USER}"
    local local_password="${DB_PASSWORD:-$MYSQL_PASSWORD}"
    local local_database="${DB_NAME:-$MYSQL_DATABASE}"

    if [[ -n "$local_user" && -n "$local_password" && -n "$local_database" ]]; then
        echo "  Host: $local_host:$local_port"
        echo "  Database: $local_database"
        if test_connection "$local_host" "$local_port" "$local_user" "$local_password" "$local_database" 2>/dev/null; then
            local size=$(get_db_size "$local_host" "$local_port" "$local_user" "$local_password" "$local_database")
            echo -e "  Status: ${GREEN}Connected${NC} (Size: $size)"
        else
            echo -e "  Status: ${RED}Disconnected${NC}"
        fi
    else
        echo -e "  Status: ${YELLOW}Not configured${NC}"
    fi

    echo ""
    echo -e "${CYAN}Remote/Production Database:${NC}"
    load_env "$ENV_PROD_FILE" 2>/dev/null || true
    local remote_host="${REMOTE_DB_HOST:-$DB_HOST}"
    local remote_port="${REMOTE_DB_PORT:-$DB_PORT:-$MYSQL_PORT:-$DEFAULT_REMOTE_PORT}"
    local remote_user="${REMOTE_DB_USER:-$DB_USER:-$MYSQL_USER}"
    local remote_password="${REMOTE_DB_PASSWORD:-$DB_PASSWORD:-$MYSQL_PASSWORD}"
    local remote_database="${REMOTE_DB_NAME:-$DB_NAME:-$MYSQL_DATABASE}"

    if [[ -n "$remote_host" && -n "$remote_user" && -n "$remote_password" && -n "$remote_database" ]]; then
        echo "  Host: $remote_host:$remote_port"
        echo "  Database: $remote_database"
        if test_connection "$remote_host" "$remote_port" "$remote_user" "$remote_password" "$remote_database" 2>/dev/null; then
            local size=$(get_db_size "$remote_host" "$remote_port" "$remote_user" "$remote_password" "$remote_database")
            echo -e "  Status: ${GREEN}Connected${NC} (Size: $size)"
        else
            echo -e "  Status: ${RED}Disconnected${NC}"
        fi
    else
        echo -e "  Status: ${YELLOW}Not configured${NC}"
    fi

    echo ""
    echo -e "${CYAN}Backup Directory:${NC} $BACKUP_DIR"
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_count=$(find "$BACKUP_DIR" -name "*.sql" -type f 2>/dev/null | wc -l)
        local backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        echo "  Backups: $backup_count files ($backup_size total)"
    else
        echo "  Backups: Directory not found"
    fi
}

# Function to show help
show_help() {
    print_header "PoolTracker Database Management Tool"

    echo -e "${CYAN}USAGE:${NC}"
    echo "  $0 <command> [options]"
    echo ""

    echo -e "${CYAN}COMMANDS:${NC}"
    echo -e "  ${GREEN}dump-local${NC}              Dump local database to backup file"
    echo -e "  ${GREEN}dump-remote${NC}             Dump remote/production database to backup file"
    echo -e "  ${GREEN}restore-local${NC} [file]    Restore local database from backup file"
    echo -e "  ${GREEN}restore-remote${NC} <file>   Restore remote database from backup file (DANGEROUS)"
    echo -e "  ${GREEN}list${NC}                    List all available backup files"
    echo -e "  ${GREEN}status${NC}                  Show database connection status and info"
    echo -e "  ${GREEN}clean${NC} [days]            Clean backups older than N days (default: 7)"
    echo -e "  ${GREEN}help${NC}                    Show this help message"
    echo ""

    echo -e "${CYAN}EXAMPLES:${NC}"
    echo "  $0 dump-local                    # Create backup of local database"
    echo "  $0 dump-remote                   # Create backup of remote database"
    echo "  $0 restore-local                 # Restore from latest local backup"
    echo "  $0 restore-local backup.sql      # Restore from specific backup file"
    echo "  $0 restore-remote backup.sql     # Restore remote from backup (requires confirmation)"
    echo "  $0 list                          # Show all available backups"
    echo "  $0 clean 30                      # Clean backups older than 30 days"
    echo ""

    echo -e "${CYAN}CONFIGURATION:${NC}"
    echo "  Local DB config:  $ENV_FILE"
    echo "  Remote DB config: $ENV_PROD_FILE"
    echo "  Backup directory: $BACKUP_DIR"
    echo ""

    echo -e "${CYAN}ENVIRONMENT VARIABLES (for remote):${NC}"
    echo "  REMOTE_DB_HOST       Remote database host"
    echo "  REMOTE_DB_PORT       Remote database port"
    echo "  REMOTE_DB_USER       Remote database user"
    echo "  REMOTE_DB_PASSWORD   Remote database password"
    echo "  REMOTE_DB_NAME       Remote database name"
    echo ""

    echo -e "${YELLOW}NOTE:${NC} For remote operations, add REMOTE_DB_* variables to .env.prod"
    echo -e "${YELLOW}      or ensure DB_* variables point to your remote database.${NC}"
}

# Main script logic
main() {
    # Check if MySQL client is available
    check_mysql_client

    # Parse command line arguments
    local command="$1"
    shift || true

    case "$command" in
        "dump-local")
            dump_local
            ;;
        "dump-remote")
            dump_remote
            ;;
        "restore-local")
            restore_local "$1"
            ;;
        "restore-remote")
            if [[ -z "$1" ]]; then
                print_error "Backup file is required for remote restore!"
                show_help
                exit 1
            fi
            restore_remote "$1"
            ;;
        "list")
            list_backups
            ;;
        "status")
            show_status
            ;;
        "clean")
            clean_backups "$1"
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
