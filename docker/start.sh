#!/bin/sh
set -e

# Start nginx in background
nginx -g "daemon on;"

# Start Node.js server
cd /app/server
exec node server.js
