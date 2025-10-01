#!/bin/bash
#
# Production Pipeline Test Script
# Tests the production Docker setup locally before Kubernetes deployment
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Starting PoolTracker Production Pipeline Test..."

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    print_warning ".env.prod not found. Creating from template..."
    cp .env.prod.template .env.prod
    print_warning "Please update .env.prod with your actual values before continuing."
    print_warning "Press Enter to continue or Ctrl+C to abort..."
    read -r
fi

# Clean up previous test runs
print_status "Cleaning up previous test runs..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod down -v --remove-orphans 2>/dev/null || true

# Build the production image
print_status "Building production Docker image..."
if docker-compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache; then
    print_success "Production image built successfully"
else
    print_error "Failed to build production image"
    exit 1
fi

# Start the production stack
print_status "Starting production stack..."
if docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d; then
    print_success "Production stack started"
else
    print_error "Failed to start production stack"
    exit 1
fi

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
timeout=120
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker-compose -f docker-compose.prod.yml --env-file .env.prod ps | grep -q "healthy\|Up"; then
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    print_status "Waiting... ($elapsed/${timeout}s)"
done

# Check service health
print_status "Checking service health..."

# Test frontend (nginx)
if curl -f -s http://localhost/ >/dev/null; then
    print_success "Frontend (nginx) is responding on port 80"
else
    print_error "Frontend is not responding"
fi

# Test backend API
if curl -f -s http://localhost:3001/ >/dev/null; then
    print_success "Backend API is responding on port 3001"
else
    print_warning "Backend API may not be responding directly (this might be normal if proxied through nginx)"
fi

# Test database connection
if docker-compose -f docker-compose.prod.yml --env-file .env.prod exec -T db mysql -u root -p"$(grep MYSQL_ROOT_PASSWORD .env.prod | cut -d'=' -f2)" -e "SELECT 1;" >/dev/null 2>&1; then
    print_success "Database is accessible"
else
    print_error "Database connection failed"
fi

# Show running services
print_status "Production stack status:"
docker-compose -f docker-compose.prod.yml --env-file .env.prod ps

# Show logs summary
print_status "Recent application logs:"
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=10 app

print_status "Production pipeline test endpoints:"
echo "  🌐 Frontend: http://localhost"
echo "  🔌 Backend API: http://localhost:3001"
echo "  🗃️  PHPMyAdmin: http://localhost:8080"

print_success "Production pipeline test completed!"
print_status "To view logs: docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f"
print_status "To stop: docker-compose -f docker-compose.prod.yml --env-file .env.prod down"
print_status "To clean up: docker-compose -f docker-compose.prod.yml --env-file .env.prod down -v --remove-orphans"
