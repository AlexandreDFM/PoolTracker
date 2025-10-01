#!/bin/bash

# 🗄️ Quick Database Management Wrapper
# Provides easy access to database management functions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_MANAGER="$SCRIPT_DIR/db-manager.sh"

# Check if db-manager.sh exists
if [[ ! -f "$DB_MANAGER" ]]; then
    echo "❌ Database manager script not found: $DB_MANAGER"
    exit 1
fi

# Make sure it's executable
chmod +x "$DB_MANAGER"

# Pass all arguments to the main script
exec "$DB_MANAGER" "$@"
