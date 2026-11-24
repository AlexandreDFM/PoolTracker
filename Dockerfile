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
COPY docker/start.sh /app/start.sh

# Everything runs as the unprivileged "node" user (uid 1000) of the base image:
# nginx listens on 8080 and writes its pid and temp files under /tmp
RUN chmod +x /app/start.sh && \
    mkdir -p /var/log/nginx /var/lib/nginx && \
    chown -R node:node /var/log/nginx /var/lib/nginx

USER node

ENV NODE_ENV=production
ENV PORT=3001

# HTTP only: TLS ends at the Kubernetes ingress (Traefik)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -fs http://localhost:8080/api/health/live || exit 1

CMD ["/app/start.sh"]
