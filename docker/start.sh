#!/bin/sh
set -e

echo "Starting PoolTracker application..."

# Check if SSL certificates are available
if [ -f "/etc/ssl/certs/tls.crt" ] && [ -f "/etc/ssl/private/tls.key" ]; then
    echo "SSL certificates found, enabling HTTPS support"
    
    # Verify certificate validity
    if openssl x509 -in /etc/ssl/certs/tls.crt -noout -checkend 0 >/dev/null 2>&1; then
        echo "SSL certificate is valid"
        export SSL_ENABLED=true
    else
        echo "WARNING: SSL certificate is expired or invalid, using HTTP only"
        export SSL_ENABLED=false
    fi
    
    # Set proper permissions for SSL files
    chmod 644 /etc/ssl/certs/tls.crt
    chmod 600 /etc/ssl/private/tls.key
    chown nginx:nginx /etc/ssl/certs/tls.crt /etc/ssl/private/tls.key
else
    echo "No SSL certificates found, using HTTP only"
    export SSL_ENABLED=false
fi

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Start nginx in background
echo "Starting nginx web server..."
nginx -g "daemon on;"

# Wait a moment for nginx to start
sleep 2

# Verify nginx is running
if pgrep nginx > /dev/null; then
    echo "Nginx started successfully"
    
    # Show listening ports
    if command -v netstat >/dev/null 2>&1; then
        echo "Listening on ports:"
        netstat -tlnp 2>/dev/null | grep nginx || true
    fi
else
    echo "ERROR: Failed to start nginx"
    exit 1
fi

# Start Node.js server
echo "Starting Node.js backend server..."
cd /app/server

# Set Node.js environment
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3001}"

echo "Node.js server starting on port $PORT"
exec node server.js
