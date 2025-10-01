#!/bin/bash

# 🛠️ Database Management Setup Script
# Sets up the database management environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_header "PoolTracker Database Management Setup"

# 1. Check for MySQL client tools
print_status "Checking MySQL client tools..."
if command -v mysql &> /dev/null && command -v mysqldump &> /dev/null; then
    print_success "MySQL client tools found"
    mysql --version
    mysqldump --version
else
    print_warning "MySQL client tools not found!"
    echo ""
    echo "Please install MySQL client tools:"
    echo -e "  ${CYAN}macOS:${NC} brew install mysql-client"
    echo -e "  ${CYAN}Ubuntu/Debian:${NC} sudo apt-get install mysql-client-core-8.0"
    echo -e "  ${CYAN}CentOS/RHEL:${NC} sudo yum install mysql"
    echo ""
    echo "After installation, run this setup script again."
    exit 1
fi

# 2. Create backup directory
print_status "Creating backup directory..."
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"
print_success "Backup directory created: $BACKUP_DIR"

# 3. Check environment files
print_status "Checking environment files..."

ENV_FILE="$PROJECT_ROOT/.env"
ENV_PROD_FILE="$PROJECT_ROOT/.env.prod"
ENV_TEMPLATE="$PROJECT_ROOT/.env.example"
ENV_PROD_TEMPLATE="$PROJECT_ROOT/.env.prod.template"

if [[ -f "$ENV_FILE" ]]; then
    print_success "Local environment file exists: $ENV_FILE"
else
    print_warning "Local environment file not found: $ENV_FILE"
    if [[ -f "$ENV_TEMPLATE" ]]; then
        print_status "Copying from template..."
        cp "$ENV_TEMPLATE" "$ENV_FILE"
        print_warning "Please edit $ENV_FILE with your local database settings"
    fi
fi

if [[ -f "$ENV_PROD_FILE" ]]; then
    print_success "Production environment file exists: $ENV_PROD_FILE"
else
    print_warning "Production environment file not found: $ENV_PROD_FILE"
    if [[ -f "$ENV_PROD_TEMPLATE" ]]; then
        print_status "Copying from template..."
        cp "$ENV_PROD_TEMPLATE" "$ENV_PROD_FILE"
        print_warning "Please edit $ENV_PROD_FILE with your remote database settings"
    fi
fi

# 4. Make scripts executable
print_status "Making scripts executable..."
chmod +x "$SCRIPT_DIR/db-manager.sh"
chmod +x "$SCRIPT_DIR/db.sh"
print_success "Scripts are now executable"

# 5. Test database manager
print_status "Testing database manager..."
if "$SCRIPT_DIR/db-manager.sh" status &>/dev/null; then
    print_success "Database manager is working correctly"
else
    print_warning "Database manager test failed (this is normal if databases aren't configured yet)"
fi

# 6. Show next steps
print_header "Setup Complete!"

echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Configure your environment files:${NC}"
echo "   - Edit $ENV_FILE for local database settings"
echo "   - Edit $ENV_PROD_FILE for remote database settings"
echo ""
echo -e "2. ${YELLOW}Test database connections:${NC}"
echo "   cd scripts && ./db-manager.sh status"
echo ""
echo -e "3. ${YELLOW}Try basic operations:${NC}"
echo "   ./db-manager.sh help                 # Show all commands"
echo "   ./db-manager.sh list                 # List backups"
echo "   ./db-manager.sh dump-local           # Backup local database"
echo ""
echo -e "4. ${YELLOW}For easier access, use the wrapper:${NC}"
echo "   ./db.sh status                       # Same as ./db-manager.sh status"
echo "   ./db.sh dump-local                   # Same as ./db-manager.sh dump-local"
echo ""

echo -e "${GREEN}Database management system is ready! 🎉${NC}"
echo ""
echo -e "${CYAN}Documentation:${NC}"
echo "  - DB-MANAGEMENT.md - Complete usage guide"
echo "  - db-manager.sh help - Command reference"
echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo "  ./db.sh help         # Show help"
echo "  ./db.sh status       # Check database status"
echo "  ./db.sh list         # List all backups"
