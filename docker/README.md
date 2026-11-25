# Docker

One image, built by the root `Dockerfile`, is used everywhere: Kubernetes (production and preprod) and the local production-like stack (`docker-compose.yml`).

The image holds the Vite build of the client, the Node server and nginx, and runs as two processes:

| Container (Kubernetes) / service (Compose) | Command | Port |
|---|---|---|
| `web` | `nginx -e stderr -g 'daemon off;'`: client build, `/api` proxied to `127.0.0.1:3001` | 8080 |
| `api` | `node server.js` (default command): API, schema migrations at start, quest scheduler | 3001 |

Both run as the unprivileged `node` user (uid 1000) and write only under `/tmp`, so the root filesystem can be read-only. In Kubernetes they are two containers of the same pod; in Compose, `web` shares the network namespace of `api`.

## Files

| Path | Content |
|---|---|
| `docker/nginx/nginx.conf` | nginx main config (pid and temp files under `/tmp`, logs to the container output) |
| `docker/nginx/default.conf` | Site: security headers, SPA fallback, `/api` proxy, `/health` |

## Local stacks

```bash
make build && make start     # docker-compose.yml: same image as production, MySQL, phpMyAdmin
make dev-up                  # docker-compose.dev.yml: Vite and node --watch with hot reload
```

Both read `.env` (see `.env.example`).
