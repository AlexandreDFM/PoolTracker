# PoolTracker Kubernetes Production Deployment

The Kubernetes manifests live in `deploy/kubernetes/`. Production is deployed by the GitHub Actions workflow `.github/workflows/production-deployment.yml` on every push to `main`.

## 📁 Files Overview

- **`namespaces.yaml`** - Production namespace configuration
- **`production/`** - Production environment manifests
  - **`deployment.yaml`** - Main application deployment
  - **`service.yaml`** - Service configuration
  - **`ingress.yaml`** - Traefik ingress with SSL/TLS
  - **`configmap.yaml`** - Non-sensitive configuration
  - **`secret.yaml`** - Sensitive data template
  - **`database.yaml`** - MySQL database deployment

## 🚀 Quick Deployment

### Prerequisites

1. **Kubernetes cluster** with Traefik ingress controller
2. **kubectl** configured and connected to your cluster
3. **GitHub Container Registry access** for the Docker image
4. **DNS** pointing `pool.nice-tek.eu` and `www.pool.nice-tek.eu` to your cluster

### Deploy to Production

Merge to `main`, or run the workflow manually:

```bash
gh workflow run production-deployment.yml --repo epitech-nice/PoolTracker
```

## 🔧 Manual Deployment Steps

If you prefer manual control:

### 1. Create Namespace
```bash
kubectl apply -f namespaces.yaml
```

### 2. Configure Secrets
Update the secrets in `production/secret.yaml` with your actual values:

```bash
# Database password (base64 encoded)
echo -n "your-secure-db-password" | base64

# JWT secret (base64 encoded)  
echo -n "your-jwt-secret-key" | base64

# Apply secrets
kubectl apply -f production/secret.yaml
```

### 3. Create GitHub Registry Secret
```bash
kubectl create secret docker-registry github-container-registry \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<PAT with read:packages> \
  --docker-email=<your-email> \
  --namespace=pool-tracker-prod
```

### 4. Deploy Application Stack
```bash
# Apply configuration
kubectl apply -f production/configmap.yaml

# Deploy database
kubectl apply -f production/database.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=mysql -n pool-tracker-prod --timeout=300s

# Deploy application
kubectl apply -f production/deployment.yaml
kubectl apply -f production/service.yaml

# Wait for app to be ready
kubectl wait --for=condition=ready pod -l app=pool-tracker -n pool-tracker-prod --timeout=300s

# Setup ingress
kubectl apply -f production/ingress.yaml
```

## 📊 Production Configuration

### Application Settings
- **Replicas**: 1 (the quest scheduler runs in the server process; more replicas would assign quests several times)
- **Resources**: 256Mi-512Mi RAM, 100m-300m CPU
- **Health Checks**: Liveness, readiness, and startup probes
- **Port**: 80 (nginx frontend) + 3001 (Node.js backend)

### Database Settings
- **MySQL**: 8.0.35
- **Storage**: 20Gi persistent volume
- **Resources**: 512Mi-1Gi RAM, 200m-500m CPU
- **Backup**: Configure external backup solution

### Security Features
- **HTTPS**: Automatic SSL/TLS with Let's Encrypt
- **Security Headers**: XSS protection, content type options, etc.
- **Rate Limiting**: 50 requests/second, 100 burst
- **CORS**: Configured for production domains

## 🛠 Management Commands

### View Application Status
```bash
kubectl get all -n pool-tracker-prod
```

### View Logs
```bash
# Application logs
kubectl logs -f deployment/pool-tracker-deployment-prod -n pool-tracker-prod

# Database logs
kubectl logs -f deployment/pool-tracker-db-deployment-prod -n pool-tracker-prod
```

### Scale Application
```bash
kubectl scale deployment pool-tracker-deployment-prod --replicas=5 -n pool-tracker-prod
```

### Update Application
```bash
# Update image tag
kubectl set image deployment/pool-tracker-deployment-prod pool-tracker=ghcr.io/epitech-nice/pool-tracker:v1.1.0 -n pool-tracker-prod

# Or apply updated deployment.yaml
kubectl apply -f production/deployment.yaml
```

### Port Forwarding (for testing)
```bash
kubectl port-forward service/pool-tracker-service-prod 8080:80 -n pool-tracker-prod
```

## 🔍 Troubleshooting

### Check Pod Status
```bash
kubectl describe pods -n pool-tracker-prod
```

### View Events
```bash
kubectl get events -n pool-tracker-prod --sort-by='.lastTimestamp'
```

### Access Database
```bash
kubectl exec -it deployment/pool-tracker-db-deployment-prod -n pool-tracker-prod -- mysql -u root -p
```

### Debug Network Issues
```bash
# Test service connectivity
kubectl run debug --image=busybox -it --rm --restart=Never -n pool-tracker-prod -- /bin/sh

# Inside the debug pod:
wget -qO- pool-tracker-service-prod:80
nslookup pool-tracker-service-prod
```

## 🔄 Backup and Recovery

### Database Backup
```bash
kubectl exec deployment/pool-tracker-db-deployment-prod -n pool-tracker-prod -- mysqldump -u root -p pool_tracker_prod > backup.sql
```

### Restore Database
```bash
kubectl exec -i deployment/pool-tracker-db-deployment-prod -n pool-tracker-prod -- mysql -u root -p pool_tracker_prod < backup.sql
```

## 🚨 Monitoring and Alerts

Consider implementing:
- **Prometheus/Grafana** for metrics
- **ELK Stack** for log aggregation  
- **Alertmanager** for notifications
- **Health check endpoints** monitoring

## 🔐 Security Considerations

1. **Secrets Management**: Use external secret management (Vault, AWS Secrets Manager)
2. **Network Policies**: Implement Kubernetes network policies
3. **Pod Security Standards**: Apply pod security contexts
4. **RBAC**: Configure role-based access control
5. **Image Scanning**: Scan images for vulnerabilities
6. **Regular Updates**: Keep base images and dependencies updated

## 📞 Support

For issues with the deployment:
1. Check pod logs and events
2. Verify secret values are correct
3. Ensure ingress controller is working
4. Check DNS resolution
5. Validate SSL certificate generation
