# 🚀 GitHub Actions Production Deployment Pipeline

Complete CI/CD pipeline for PoolTracker with secure secret management and Kubernetes deployment.

## 🏗️ **Pipeline Overview**

The pipeline consists of:
1. **🔨 Build Stage**: Multi-platform Docker image build and push
2. **🚀 Deploy Stage**: Kubernetes deployment with secret injection
3. **🔍 Verify Stage**: Health checks and deployment verification
4. **🧹 Cleanup Stage**: Rollback on failure (optional)

## 📁 **Files Structure**

```
.github/
├── workflows/
│   ├── production-deployment.yml    # 🆕 Complete pipeline
│   ├── build-docker-prod.yml        # 📦 Legacy build workflow
│   └── deploy-prod.yml              # 🚀 Legacy deploy workflow
└── SECRETS-SETUP.md                 # 🔐 Secret setup guide

deploy/kubernetes/
├── deploy-production-github.sh      # 🆕 GitHub Actions compatible script
└── deploy-production.sh             # 🛠️ Manual deployment script
```

## 🔧 **Setup Instructions**

### 1. **Configure GitHub Secrets**
Follow the detailed guide in [`.github/SECRETS-SETUP.md`](./.github/SECRETS-SETUP.md)

**Required Secrets:**
- `KUBERNETES_URL` - Your K8s cluster API endpoint
- `KUBERNETES_SECRET` - Service account token or kubeconfig
- `PROD_DB_USER` - Database username
- `PROD_DB_PASSWORD` - Database password
- `PROD_DB_NAME` - Database name
- `PROD_JWT_SECRET` - JWT signing secret
- `PROD_SESSION_SECRET` - Session encryption secret
- `PROD_MYSQL_ROOT_PASSWORD` - MySQL root password

### 2. **Pipeline Triggers**

The pipeline automatically triggers on:
- ✅ **Push to `main`** - Full production deployment
- ✅ **Push to `feature/deploy-prod`** - Staging deployment
- ✅ **Version tags** (`v1.0.0`) - Release deployment
- ✅ **Manual dispatch** - On-demand deployment

### 3. **Manual Trigger**
```bash
# Via GitHub CLI
gh workflow run production-deployment.yml

# Via GitHub UI
Go to Actions → Production Deployment Pipeline → Run workflow
```

## 🔄 **Pipeline Stages**

### **Stage 1: Build & Push** 🔨
```yaml
- Checkout code
- Set up Docker Buildx
- Log in to GitHub Container Registry
- Build multi-platform image (AMD64/ARM64)
- Push with multiple tags
- Generate Software Bill of Materials (SBOM)
```

**Output**: `ghcr.io/itskarmaoff/pool-tracker:latest`

### **Stage 2: Deploy** 🚀
```yaml
- Set up Kubernetes context
- Create/update namespace
- Inject production secrets
- Deploy database (if new)
- Deploy application with new image
- Configure ingress and networking
- Wait for rollout completion
```

**Environment**: `production` with approval gates

### **Stage 3: Verify** 🔍
```yaml
- Check pod health
- Verify service endpoints
- Test application connectivity
- Monitor deployment events
- Generate deployment report
```

**Output**: Deployment status and health metrics

### **Stage 4: Cleanup** 🧹 (on failure)
```yaml
- Gather debug information
- Log pod details and events
- Optional rollback to previous version
```

## 🛡️ **Security Features**

### **Secret Management**
- ✅ All secrets stored in GitHub Secrets
- ✅ Dynamic secret injection to Kubernetes
- ✅ No secrets in code or logs
- ✅ Automatic secret rotation support

### **Image Security**
- ✅ Multi-platform builds (AMD64/ARM64)
- ✅ SBOM generation for vulnerability scanning
- ✅ Signed container images
- ✅ Registry security scanning

### **Deployment Security**
- ✅ Namespace isolation
- ✅ Service account permissions
- ✅ Network policies support
- ✅ Resource limits and quotas

## 📊 **Monitoring & Observability**

### **Pipeline Monitoring**
```bash
# View workflow runs
gh run list --repo ItsKarmaOff/PoolTracker

# View specific run logs
gh run view [RUN_ID] --log

# Watch real-time logs
gh run watch
```

### **Application Monitoring**
```bash
# Check deployment status
kubectl get all -n pool-tracker-prod

# View application logs
kubectl logs -f deployment/pool-tracker-deployment-prod -n pool-tracker-prod

# Monitor pod health
kubectl get pods -n pool-tracker-prod -w
```

### **Health Endpoints**
- **Frontend**: https://pool.nice-tek.eu
- **API**: https://pool.nice-tek.eu/api/
- **Health Check**: Port-forward for internal testing

## 🔧 **Customization Options**

### **Environment Variables**
```yaml
env:
  TIMEOUT: "600"              # Deployment timeout (seconds)
  REPLICAS: "3"               # Number of app replicas
  FORCE_REDEPLOY: "false"     # Force complete redeployment
```

### **Image Tagging Strategy**
The pipeline uses multiple tagging strategies:
- `latest` - Latest main branch
- `v1.0.0` - Semantic version tags
- `main-abc1234` - Branch + commit SHA
- `pr-123` - Pull request builds

### **Deployment Environments**
```yaml
# Production (default)
environment: production
url: https://pool-tracker.fr

# Staging (custom)
environment: staging
url: https://staging.pool-tracker.fr
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **❌ Build Failures**
```bash
# Check Docker build logs
gh run view [RUN_ID] --log | grep "docker build"

# Test build locally
docker build -t pool-tracker:test .
```

#### **❌ Deployment Failures**
```bash
# Check Kubernetes connectivity
kubectl cluster-info

# Verify secrets exist
kubectl get secrets -n pool-tracker-prod

# Check pod logs
kubectl logs -l app=pool-tracker -n pool-tracker-prod --previous
```

#### **❌ Secret Issues**
```bash
# Verify GitHub secrets
gh secret list --repo ItsKarmaOff/PoolTracker

# Test secret values (be careful!)
kubectl get secret pool-tracker-secret-prod -n pool-tracker-prod -o yaml
```

### **Debug Commands**
```bash
# Complete cluster state
kubectl get all -n pool-tracker-prod -o wide

# Recent events
kubectl get events -n pool-tracker-prod --sort-by=.metadata.creationTimestamp

# Pod details
kubectl describe pods -l app=pool-tracker -n pool-tracker-prod

# Network troubleshooting
kubectl exec -it deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- /bin/sh
```

## 📈 **Performance Optimization**

### **Build Performance**
- ✅ Docker layer caching
- ✅ Multi-stage builds
- ✅ Parallel platform builds
- ✅ Registry cache utilization

### **Deployment Performance**
- ✅ Rolling updates (zero downtime)
- ✅ Readiness/liveness probes
- ✅ Resource requests/limits
- ✅ Horizontal pod autoscaling ready

### **Network Performance**
- ✅ Ingress with SSL termination
- ✅ Service mesh ready
- ✅ CDN integration support
- ✅ Rate limiting configured

## 🔄 **Rollback Procedures**

### **Automatic Rollback**
The pipeline includes automatic rollback on deployment failure:
```yaml
- name: Rollback if needed
  if: failure()
  run: kubectl rollout undo deployment/pool-tracker-deployment-prod -n pool-tracker-prod
```

### **Manual Rollback**
```bash
# Rollback to previous version
kubectl rollout undo deployment/pool-tracker-deployment-prod -n pool-tracker-prod

# Rollback to specific revision
kubectl rollout undo deployment/pool-tracker-deployment-prod --to-revision=2 -n pool-tracker-prod

# View rollout history
kubectl rollout history deployment/pool-tracker-deployment-prod -n pool-tracker-prod
```

## 🎯 **Best Practices**

### **Development Workflow**
1. 🔨 **Develop** on feature branches
2. 🧪 **Test** locally with `docker-compose.prod.yml`
3. 📤 **Push** to `feature/deploy-prod` for staging
4. 🔍 **Review** deployment in staging
5. 🚀 **Merge** to `main` for production

### **Security Practices**
1. 🔐 **Rotate secrets** every 90 days
2. 🛡️ **Monitor** security advisories
3. 🔍 **Scan** images for vulnerabilities
4. 📝 **Audit** access logs regularly
5. 🔒 **Use** least-privilege permissions

### **Operational Practices**
1. 📊 **Monitor** deployment metrics
2. 📝 **Document** changes and incidents
3. 🧪 **Test** disaster recovery procedures
4. 📈 **Scale** based on usage patterns
5. 🔄 **Automate** routine maintenance

## 🎉 **Success Indicators**

Your pipeline is working correctly when you see:
- ✅ Green checkmarks in GitHub Actions
- ✅ Healthy pods in Kubernetes
- ✅ Successful health checks
- ✅ Application accessible at https://pool-tracker.fr
- ✅ No error events in cluster
- ✅ Proper secret injection
- ✅ Database connectivity working

## 📞 **Support**

For issues with the pipeline:
1. 📖 Check this documentation
2. 🔍 Review GitHub Actions logs
3. 🛠️ Check Kubernetes cluster status
4. 🔐 Verify secret configuration
5. 📝 Create issue with logs and context

Your production deployment pipeline is now enterprise-ready! 🚀✨
