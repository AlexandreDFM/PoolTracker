# Pool Tracker

A comprehensive pool tracking system designed to manage student points and team performance during Epitech pools.

## Description

PoolTracker is a full-stack web application that allows administrators, pedagogical team members, and assistants to track and manage student performance during Epitech pools. The system features role-based access control, team management, point assignment, and detailed performance tracking for students and teams.

## Key Features

- **Role-Based Access System**: Four distinct user roles (ADMIN, APE, AER, STUDENT) with appropriate permission levels
- **User Management**: Create, edit, and manage user accounts with role assignment
- **Team System**: Organize students into teams with customizable colors and descriptions
- **Points Tracking**: Assign positive or negative points to students with reasons
- **Performance Dashboard**: View team rankings and student performances
- **Student Profiles**: Individual performance tracking and point history

## Technology Stack

- **Frontend**: React, React Router, Axios, CSS
- **Backend**: Node.js, Express
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Docker, Nginx

## Project Structure

```
PoolTracker/
├── client/              # React frontend application
├── server/              # Node.js backend API
├── docker/              # Docker configuration files
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore rules
├── docker-compose.yml   # Docker Compose configuration
├── Makefile             # Build automation commands
├── LICENSE              # MIT License
└── README.md            # This file
```

## Installation & Setup

### Prerequisites

- Docker and Docker Compose
- Make (optional, for using the provided commands)

### Quick Start with Docker

1. Clone the repository:
   ```
   git clone git@github.com:ItsKarmaOff/PoolTracker.git
   cd PoolTracker
   ```

2. Configure environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your desired configuration settings.

3. Build and start the services:
   ```
   make all
   ```
   
   This will start all the required containers:
   - Frontend (React)
   - Backend (Node.js/Express)
   - Database (MySQL)
   - phpMyAdmin

4. Access the application:
   - Frontend: http://localhost:[CLIENT_PORT]
   - API: http://localhost:[SERVER_PORT]
   - phpMyAdmin: http://localhost:8080

### Available Make Commands

- `make all`: Build and start all services
- `make build`: Build Docker images
- `make start`: Start Docker containers
- `make stop`: Stop Docker containers
- `make down`: Stop and remove containers
- `make restart`: Restart all containers
- `make logs`: Show container logs
- `make clean`: Remove all containers, volumes, and images
- `make help`: Show available commands

### Manual Setup (Without Docker)

See the README files in the [client](client/README.md) and [server](server/README.md) directories for instructions on setting up each component separately.

## Usage

### Default Admin Account

On the first startup, a default admin account is created:
- Email: `ADMIN_INITIAL_EMAIL` (default: admin@epitech.eu)
- Password: `ADMIN_INITIAL_PASSWORD` if set, otherwise a random password printed once in the server logs

This only happens when the database contains no admin account.

**Change this password after the first login.**

### User Roles

1. **ADMIN**: Full access to all features, can manage all users
2. **APE (Assistant Pédagogique Epitech)**: Can manage teams, students, and points
3. **AER (Assistant Epitech Régional)**: Can only manage points for students
4. **STUDENT**: Can view their profile and team information

## Database Management

PoolTracker includes comprehensive database management tools for backing up and restoring both local and remote databases.

### Quick Database Operations

```bash
# Setup database management (first time only)
cd scripts && ./setup-db-management.sh

# Check database status
./db.sh status

# Backup local database
./db.sh dump-local

# Backup remote/production database
./db.sh dump-remote

# Restore local database (from latest backup)
./db.sh restore-local

# List all available backups
./db.sh list

# Show help and all commands
./db.sh help
```

### Database Management Features

- ✅ **Local & Remote Database Support** - Backup and restore both development and production databases
- ✅ **Automatic Backup Organization** - Timestamped backups with latest symlinks
- ✅ **Safe Remote Operations** - Explicit confirmation required for production restores
- ✅ **Connection Validation** - Tests database connectivity before operations
- ✅ **Backup Cleanup** - Automatic cleanup of old backup files
- ✅ **Comprehensive Logging** - Detailed status and progress information

For complete database management documentation, see [documentation/DB-MANAGEMENT.md](documentation/DB-MANAGEMENT.md).

## Documentation

- [Client Documentation](client/README.md)
- [Server Documentation](server/README.md)
- [Docker Documentation](docker/README.md)
- [Database Management](documentation/DB-MANAGEMENT.md)
- [Production Deployment](deploy/kubernetes/README.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Epitech for inspiring this project
- All contributors who have helped improve this system
