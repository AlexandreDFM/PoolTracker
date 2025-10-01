# 🗄️ Database Management Scripts

This directory contains scripts for managing PoolTracker databases, including dumping and restoring both local and remote databases.

## 📁 Files

- **`db-manager.sh`** - Main database management script
- **`DB-MANAGEMENT.md`** - This documentation file

## 🚀 Quick Start

### **Basic Usage**
```bash
# Navigate to scripts directory
cd scripts

# Show help and available commands
./db-manager.sh help

# Check database status
./db-manager.sh status

# List all backups
./db-manager.sh list
```

### **Local Database Operations**
```bash
# Dump local database
./db-manager.sh dump-local

# Restore local database (from latest backup)
./db-manager.sh restore-local

# Restore local database (from specific backup)
./db-manager.sh restore-local pool_tracker_local_20251001_143022.sql
```

### **Remote Database Operations**
```bash
# Dump remote/production database
./db-manager.sh dump-remote

# Restore remote database (requires confirmation)
./db-manager.sh restore-remote pool_tracker_remote_20251001_143022.sql
```

### **Maintenance Operations**
```bash
# Clean old backups (older than 7 days)
./db-manager.sh clean

# Clean old backups (older than 30 days)
./db-manager.sh clean 30
```

## ⚙️ Configuration

### **Local Database Configuration**
Configure local database settings in `.env` file:

```bash
# Local database settings
DB_HOST=localhost
DB_PORT=3306
DB_USER=pool_tracker_user
DB_PASSWORD=your_local_password
DB_NAME=pool_tracker_dev

# Alternative MySQL settings (fallback)
MYSQL_PORT=3306
MYSQL_USER=pool_tracker_user
MYSQL_PASSWORD=your_local_password
MYSQL_DATABASE=pool_tracker_dev
```

### **Remote Database Configuration**
Configure remote database settings in `.env.prod` file:

**Option 1: Use REMOTE_DB_* variables (recommended)**
```bash
# Remote/Production database settings
REMOTE_DB_HOST=your-production-db-host.com
REMOTE_DB_PORT=3306
REMOTE_DB_USER=prod_user
REMOTE_DB_PASSWORD=secure_prod_password
REMOTE_DB_NAME=pool_tracker_prod

# Local database settings (for fallback)
DB_HOST=db
DB_USER=pool_tracker_user
DB_PASSWORD=local_password
DB_NAME=pool_tracker_prod
```

**Option 2: Use DB_* variables directly**
```bash
# Database settings (will be used for remote operations)
DB_HOST=your-production-db-host.com
DB_PORT=3306
DB_USER=prod_user
DB_PASSWORD=secure_prod_password
DB_NAME=pool_tracker_prod
```

## 📂 Backup Directory Structure

Backups are stored in `../backups/` directory with the following naming convention:

```
backups/
├── pool_tracker_local_20251001_143022.sql      # Local backup with timestamp
├── pool_tracker_remote_20251001_150000.sql     # Remote backup with timestamp  
├── pool_tracker_local_latest.sql               # Symlink to latest local backup
└── pool_tracker_remote_latest.sql              # Symlink to latest remote backup
```

## 🔒 Security Features

### **Connection Validation**
- ✅ Tests database connectivity before operations
- ✅ Validates required environment variables
- ✅ Shows database size and connection status

### **Safe Remote Operations**
- ⚠️ **Remote restore requires explicit confirmation** (`YES`)
- ⚠️ **Remote operations show clear warnings**
- ✅ Validates backup files before restore
- ✅ Shows database information before operations

### **Backup Integrity**
- ✅ **Complete database dumps** with triggers, routines, events
- ✅ **Transactional consistency** with `--single-transaction`
- ✅ **Optimized dumps** with extended inserts and compression
- ✅ **File size validation** and integrity checks

## 📊 Command Reference

### **Dump Commands**
```bash
./db-manager.sh dump-local        # Create backup of local database
./db-manager.sh dump-remote       # Create backup of remote database
```

**Features:**
- Single-transaction dumps for consistency
- Includes triggers, routines, events, and procedures
- Creates timestamped files with symlinks to latest
- Shows database size and backup file size
- Optimized for large databases

### **Restore Commands**
```bash
./db-manager.sh restore-local                    # Restore from latest local backup
./db-manager.sh restore-local backup_file.sql    # Restore from specific file
./db-manager.sh restore-remote backup_file.sql   # Restore remote (requires confirmation)
```

**Safety Features:**
- Connection testing before restore
- File existence validation
- Database size verification after restore
- Explicit confirmation for remote restores

### **Management Commands**
```bash
./db-manager.sh list              # List all available backups with details
./db-manager.sh status            # Show database connection status and sizes
./db-manager.sh clean [days]      # Clean old backups (default: 7 days)
./db-manager.sh help              # Show detailed help information
```

## 🔧 Advanced Usage

### **Environment Variable Override**
You can override database settings using environment variables:

```bash
# Override remote database host for one-time operation
REMOTE_DB_HOST=backup-server.com ./db-manager.sh dump-remote

# Override local database for testing
DB_HOST=test-db.local ./db-manager.sh restore-local test_backup.sql
```

### **Docker Database Operations**
For Docker Compose databases:

```bash
# Local Docker database (default configuration)
./db-manager.sh dump-local

# Production Docker database via port forwarding
kubectl port-forward service/mysql-service 3306:3306 -n production &
REMOTE_DB_HOST=localhost ./db-manager.sh dump-remote
```

### **Automated Backups**
Add to crontab for automated backups:

```bash
# Daily local backup at 2 AM
0 2 * * * /path/to/pool-tracker/scripts/db-manager.sh dump-local

# Weekly remote backup on Sundays at 3 AM
0 3 * * 0 /path/to/pool-tracker/scripts/db-manager.sh dump-remote

# Monthly cleanup (keep 30 days)
0 4 1 * * /path/to/pool-tracker/scripts/db-manager.sh clean 30
```

## 🚨 Troubleshooting

### **Common Issues**

#### **❌ Connection Failed**
```bash
# Check database status
./db-manager.sh status

# Test connection manually
mysql -h localhost -P 3306 -u pool_tracker_user -p pool_tracker_dev
```

#### **❌ MySQL Client Not Found**
```bash
# macOS
brew install mysql-client

# Ubuntu/Debian
sudo apt-get install mysql-client-core-8.0

# CentOS/RHEL
sudo yum install mysql
```

#### **❌ Permission Denied**
```bash
# Make script executable
chmod +x ./db-manager.sh

# Check backup directory permissions
mkdir -p ../backups
chmod 755 ../backups
```

#### **❌ Environment Variables Missing**
```bash
# Check if .env files exist
ls -la ../.env ../.env.prod

# Validate environment variables
./db-manager.sh status
```

### **Debug Mode**
Enable verbose output for troubleshooting:

```bash
# Run with debug output
bash -x ./db-manager.sh status

# Check MySQL connection details
mysql --help | grep -A 5 "Default options"
```

## 📋 Requirements

- **MySQL Client Tools**: `mysql`, `mysqldump`
- **Environment Files**: `.env` (local), `.env.prod` (remote)
- **Permissions**: Read access to env files, write access to backup directory
- **Network**: Connectivity to database servers

## 🎯 Best Practices

### **✅ DO:**
- Test connections before operations (`./db-manager.sh status`)
- Use specific backup files for remote restores
- Regularly clean old backups (`./db-manager.sh clean`)
- Keep separate configurations for local vs remote
- Verify backups after creation

### **❌ DON'T:**
- Restore to remote without explicit confirmation
- Store database passwords in scripts
- Run remote operations without testing locally first
- Delete backup files manually (use `clean` command)
- Use production credentials in local environment files

## 🔄 Integration

### **CI/CD Integration**
```bash
# In GitHub Actions or similar
- name: Backup Database Before Deployment
  run: |
    cd scripts
    ./db-manager.sh dump-remote
    
- name: Restore Database After Failed Deployment  
  if: failure()
  run: |
    cd scripts  
    ./db-manager.sh restore-remote pool_tracker_remote_latest.sql
```

### **Docker Compose Integration**
```bash
# Add to docker-compose.yml service
services:
  db-manager:
    build: .
    volumes:
      - ./scripts:/scripts
      - ./backups:/backups
    command: /scripts/db-manager.sh dump-local
```

Your database management system is now ready! 🎉
