# 🚀 Production Pipeline Testing Guide

This guide helps you test the complete production setup locally using Docker Compose before deploying to Kubernetes.

## 📁 Files Overview

- **`docker-compose.prod.yml`** - Production-like Docker Compose setup
- **`.env.prod.template`** - Environment variables template
- **`test-production.sh`** - Automated production testing script
- **`nginx/prod.conf`** - Production-like nginx configuration (for SSL testing)

## 🎯 Quick Start

### 1. Setup Environment
```bash
# Copy environment template
cp .env.prod.template .env.prod

# Edit with your values
nano .env.prod
```

### 2. Run Production Test
```bash
# Run automated test
./test-production.sh

# Or manually
docker-compose -f docker-compose.prod.yml --env-file .env.prod up --build
```

### 3. Access Services
- **🌐 Frontend**: http://localhost
- **🔌 Backend API**: http://localhost:3001
- **🗃️ PHPMyAdmin**: http://localhost:8080

## 🔧 Key Production Features Tested

### **Static Docker Image**
- ✅ Single container with both frontend (nginx) and backend (Node.js)
- ✅ Production-optimized build process
- ✅ Health checks and monitoring
- ✅ Resource optimization

### **Database Setup**
- ✅ MySQL 8.0.35 with production configuration
- ✅ Persistent volume for data
- ✅ Automated schema initialization
- ✅ Performance tuning parameters

### **Production Environment**
- ✅ Production environment variables
- ✅ Security configurations
- ✅ Logging setup
- ✅ Health monitoring

### **Network & Security**
- ✅ Isolated network configuration
- ✅ Proper service dependencies
- ✅ Health checks for all services
- ✅ Optional SSL/TLS setup

## 📊 Testing Scenarios

### Basic Functionality Test
```bash
# Start services
./test-production.sh

# Test frontend
curl -I http://localhost/

# Test backend API
curl -I http://localhost:3001/

# Test database connection
docker-compose -f docker-compose.prod.yml exec db mysql -u root -p -e "SHOW DATABASES;"
```

### Load Testing
```bash
# Install Apache Bench
brew install apache2  # macOS
# or
sudo apt install apache2-utils  # Ubuntu

# Test frontend performance
ab -n 1000 -c 10 http://localhost/

# Test API performance
ab -n 500 -c 5 http://localhost:3001/api/health
```

### Database Performance
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec db mysql -u root -p

# Run performance queries
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool%';
SHOW GLOBAL VARIABLES LIKE 'max_connections';
```

## 🔍 Monitoring & Debugging

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f db
```

### Service Health
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Inspect specific service
docker-compose -f docker-compose.prod.yml exec app ps aux
docker-compose -f docker-compose.prod.yml exec app netstat -tulpn
```

### Resource Usage
```bash
# Container stats
docker stats $(docker-compose -f docker-compose.prod.yml ps -q)

# Disk usage
docker system df
```

## 🛠 Advanced Testing

### SSL/TLS Testing (Optional)
```bash
# Generate self-signed certificate
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Start with SSL proxy
docker-compose -f docker-compose.prod.yml --profile ssl up
```

### Performance Profiling
```bash
# Memory profiling
docker-compose -f docker-compose.prod.yml exec app node --inspect=0.0.0.0:9229 server.js &

# CPU profiling
docker-compose -f docker-compose.prod.yml exec app top
```

### Database Backup Testing
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db mysqldump -u root -p pool_tracker_prod > backup.sql

# Restore backup (in clean environment)
docker-compose -f docker-compose.prod.yml exec -T db mysql -u root -p pool_tracker_prod < backup.sql
```

## 🔄 Deployment Pipeline Validation

### 1. Image Build Test
```bash
# Test Docker build
docker build -t pool-tracker:test .

# Test image size
docker images pool-tracker:test

# Test image security
docker run --rm -it pool-tracker:test sh -c "whoami && id"
```

### 2. Configuration Validation
```bash
# Validate environment variables
docker-compose -f docker-compose.prod.yml config

# Check for missing variables
docker-compose -f docker-compose.prod.yml --env-file .env.prod config | grep -i "warning\|error"
```

### 3. Kubernetes Preparation
```bash
# Test image in Kubernetes-like environment
docker run -d --name test-k8s \
  -e NODE_ENV=production \
  -p 8080:80 \
  pool-tracker:test

# Test readiness/liveness probes
curl -f http://localhost:8080/ || echo "Health check failed"

# Cleanup
docker stop test-k8s && docker rm test-k8s
```

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec app env | grep DB_
```

**Application Won't Start**
```bash
# Check application logs
docker-compose -f docker-compose.prod.yml logs app

# Check port conflicts
netstat -tulpn | grep :80
netstat -tulpn | grep :3001
```

**Performance Issues**
```bash
# Check resource limits
docker stats

# Monitor system resources
htop  # or top
df -h
```

### Debug Commands
```bash
# Enter application container
docker-compose -f docker-compose.prod.yml exec app sh

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec app nginx -t

# Test database connection from app
docker-compose -f docker-compose.prod.yml exec app nc -zv db 3306
```

## 📈 Success Criteria

✅ **All services start without errors**
✅ **Frontend accessible on port 80**
✅ **Backend API responds on port 3001**
✅ **Database accepts connections**
✅ **Health checks pass**
✅ **No memory leaks during testing**
✅ **Performance meets requirements**
✅ **Logs show no critical errors**

## 🎯 Next Steps

After successful testing:

1. **Tag Docker image** for production registry
2. **Update Kubernetes manifests** with tested configuration
3. **Deploy to staging environment**
4. **Run integration tests**
5. **Deploy to production**

```bash
# Tag and push to registry
docker tag pool-tracker:latest ghcr.io/itskarmaoff/pool-tracker:v1.0.0
docker push ghcr.io/itskarmaoff/pool-tracker:v1.0.0

# Deploy to Kubernetes
cd deploy/kubernetes
./deploy-production.sh
```
