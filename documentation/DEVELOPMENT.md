# Development Mode

The development stack (`docker-compose.dev.yml`) runs the source code directly, without building images:

- **Client**: Vite dev server with hot reload (proxies `/api` to the server container)
- **Server**: Node.js with `nodemon` (restarts on file changes)
- **Database**: MySQL, data stored in `./db`
- **phpMyAdmin**: database management UI

## Quick Start

```bash
cp .env.example .env      # then fill in the values
make dev-up               # start in the background
make dev-logs             # follow the logs
```

Without `make`:

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f
```

On the first start with an empty database, the server creates an admin account and prints its password once in the server logs (unless `ADMIN_INITIAL_PASSWORD` is set):

```bash
make dev-logs-server
```

## Access Points

| Service | URL |
|---------|-----|
| Client (React) | http://localhost:3000 |
| API server | http://localhost:3001 |
| phpMyAdmin | http://localhost:8080 |
| MySQL | localhost:3306 |

Ports come from `CLIENT_PORT`, `SERVER_PORT` and `MYSQL_PORT` in `.env`.

## Make Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start with logs in the foreground |
| `make dev-up` | Start in the background |
| `make dev-down` | Stop all services |
| `make dev-restart` | Restart services |
| `make dev-logs` | Follow all logs |
| `make dev-logs-client` | Follow client logs |
| `make dev-logs-server` | Follow server logs |
| `make dev-clean` | Stop and remove volumes |

`make help` lists every command, including the production ones (`make build`, `make start`, `make stop`, `make logs`, `make clean`).

## Development vs Production

| | Development | Production |
|---|---|---|
| Compose file | `docker-compose.dev.yml` | `docker-compose.yml` |
| Command | `make dev-up` | `make start` |
| Build step | None | Images are built |
| Hot reload | Yes | No |
| Client | Vite dev server | Static build served by Nginx |
| Use case | Active development | Local production test |

The Kubernetes production deployment is described in [KUBERNETES-PRODUCTION-DEPLOYMENT.md](KUBERNETES-PRODUCTION-DEPLOYMENT.md).

## Environment Variables

`.env` must contain:

```env
# Client
CLIENT_PORT=3000

# Server
SERVER_PORT=3001
NODE_ENV=development
HOST=0.0.0.0

# Database
DB_HOST=db
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=pool_tracker
MYSQL_PORT=3306
MYSQL_DATABASE=pool_tracker
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_ROOT_PASSWORD=your_root_password

# JWT
JWT_SECRET=your_secret_key

# phpMyAdmin
PMA_HOST=db
PMA_USER=root
PMA_PASSWORD=your_root_password
PMA_ABSOLUTE_URI=http://localhost:8080
```

## Common Tasks

### Install a package

```bash
docker compose -f docker-compose.dev.yml exec client npm install <package>
docker compose -f docker-compose.dev.yml exec server npm install <package>
```

### Rebuild node modules

```bash
docker compose -f docker-compose.dev.yml down -v
rm -rf client/node_modules server/node_modules
make dev-up
```

### Reset the local database

This deletes all local data:

```bash
make dev-down
rm -rf db/*
make dev-up
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Containers do not start | `make dev-clean`, then `make dev-up` |
| Port already in use | Change `CLIENT_PORT`, `SERVER_PORT` or `MYSQL_PORT` in `.env` |
| Server cannot reach the database | Check `make dev-logs`; the server waits for the MySQL healthcheck, which can take about 30 s on the first start |
| Module not found | Rebuild node modules (see above) |
