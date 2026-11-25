# Multi-stage Dockerfile for PoolTracker
# One image with the React frontend (served by nginx) and the Node.js backend.

# Stage 1: Build the React frontend (Vite)
FROM node:24-alpine AS frontend-build

WORKDIR /app/client

# Install exactly the versions of the lockfile
COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Install the backend production dependencies
FROM node:24-alpine AS backend-build

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./

# Stage 3: Final production image
FROM node:24-alpine AS production

# nginx serves the static files and proxies /api to Node; curl for the health check
RUN apk add --no-cache nginx curl

WORKDIR /app

COPY --from=frontend-build /app/client/build /usr/share/nginx/html
COPY --from=backend-build /app/server ./server

RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/http.d/default.conf
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# One image, two processes run as two containers of the same pod (or two
# Compose services sharing a network namespace):
#   api: node server.js (the default command)
#   web: nginx -e stderr -g 'daemon off;' (static client, /api proxied to 127.0.0.1:3001)
# Both run as the unprivileged "node" user (uid 1000); nginx listens on 8080
# and writes only under /tmp, so the root filesystem can be read-only.
RUN mkdir -p /var/log/nginx /var/lib/nginx && \
    chown -R node:node /var/log/nginx /var/lib/nginx

USER node
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001

# HTTP only: TLS ends at the Kubernetes ingress (Traefik)
EXPOSE 8080 3001

CMD ["node", "server.js"]
