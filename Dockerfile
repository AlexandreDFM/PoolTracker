# Multi-stage Dockerfile for PoolTracker
# This builds a static image containing both the React frontend and Node.js backend

# Stage 1: Build the React frontend
FROM node:20.18-alpine AS frontend-build

WORKDIR /app/client

# Copy package files for client
COPY client/package*.json ./

# Install client dependencies
RUN npm install

# Copy client source code
COPY client/ ./

# Build the React app for production
RUN npm run build

# Stage 2: Build the Node.js backend
FROM node:18-alpine AS backend-build

WORKDIR /app/server

# Copy package files for server
COPY server/package*.json ./

# Install only production dependencies for the server
RUN npm install --only=production

# Copy server source code
COPY server/ ./

# Stage 3: Final production image
FROM node:18-alpine AS production

# Install nginx and curl for serving static files and health checks
RUN apk add --no-cache nginx curl

# Create app directory
WORKDIR /app

# Copy built React app from frontend-build stage
COPY --from=frontend-build /app/client/build /usr/share/nginx/html

# Copy server files from backend-build stage
COPY --from=backend-build /app/server ./server

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default 2>/dev/null || true

# Copy nginx configuration files
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy and set up startup script
COPY docker/start.sh /app/start.sh

# Create required directories and set permissions
RUN mkdir -p /var/lib/nginx/tmp /var/log/nginx && \
    chown -R nginx:nginx /var/lib/nginx /var/log/nginx /usr/share/nginx/html

# Make startup script executable
RUN chmod +x /app/start.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose ports (HTTP only - SSL handled by Kubernetes Ingress)
EXPOSE 80 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start the application
CMD ["/app/start.sh"]
