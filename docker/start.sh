#!/bin/sh
set -e

echo "Starting PoolTracker application..."

# Note: SSL/TLS is handled by Kubernetes Ingress Controller (Traefik)
# The container only needs to serve HTTP on port 8080
echo "SSL/TLS is handled by Kubernetes Ingress - container serves HTTP only"

# nginx runs unprivileged: its temp directories live under /tmp
mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi

# Test nginx configuration
echo "Testing nginx configuration..."
if ! nginx -t 2>&1; then
    echo "ERROR: Nginx configuration test failed"
    exit 1
fi

# Start nginx in background
echo "Starting nginx web server..."
nginx -g "daemon on;"

# Wait a moment for nginx to start
sleep 2

# Verify nginx is running
if pgrep nginx > /dev/null; then
    echo "✅ Nginx started successfully on port 8080"
else
    echo "❌ ERROR: Failed to start nginx"
    exit 1
fi

# Start Node.js server
echo "Starting Node.js backend server..."
cd /app/server

# Set Node.js environment
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3001}"

echo "✅ Node.js server starting on port $PORT"
exec node server.js
