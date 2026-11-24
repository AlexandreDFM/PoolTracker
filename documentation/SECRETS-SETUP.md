# 🔐 GitHub Secrets Setup Guide

This guide helps you configure all the required GitHub Secrets for your PoolTracker production deployment pipeline.

## 📋 Required GitHub Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### 🏗️ **Kubernetes Configuration**

| Secret Name | Description | Example Value | Required |
|-------------|-------------|---------------|----------|
| `KUBERNETES_URL` | Your Kubernetes cluster API endpoint | `https://k8s.your-cluster.com:6443` | ✅ |
| `KUBERNETES_SECRET` | Base64-encoded kubeconfig or service account token | `eyJhbGc...` | ✅ |

### 🗄️ **Database Configuration**

| Secret Name | Description | Example Value | Required |
|-------------|-------------|---------------|----------|
| `PROD_DB_USER` | Production database username | `pool_tracker_user` | ✅ |
| `PROD_DB_PASSWORD` | Production database password | `super_secure_password_123!` | ✅ |
| `PROD_DB_NAME` | Production database name | `pool_tracker_prod` | ✅ |
| `PROD_MYSQL_ROOT_PASSWORD` | MySQL root password | `root_password_456!` | ✅ |

### 🔑 **Application Security**

| Secret Name | Description | Example Value | Required |
|-------------|-------------|---------------|----------|
| `PROD_JWT_SECRET` | JWT signing secret (32+ chars) | `your-super-secure-jwt-secret-key-here-32chars` | ✅ |
| `PROD_SESSION_SECRET` | Session encryption secret | `another-super-secure-session-secret-key` | ✅ |

## 🚀 **Quick Setup Commands**

### 1. Generate Secure Secrets
```bash
# Generate JWT Secret (32 characters)
openssl rand -base64 32

# Generate Session Secret
openssl rand -base64 32

# Generate Database Password
openssl rand -base64 24
```

### 2. Kubernetes Service Account Setup
If you don't have a service account token yet:

```bash
# Create service account
kubectl create serviceaccount github-actions -n kube-system

# Create cluster role binding
kubectl create clusterrolebinding github-actions \
  --clusterrole=cluster-admin \
  --serviceaccount=kube-system:github-actions

# Get the token (Kubernetes 1.24+)
kubectl create token github-actions -n kube-system --duration=8760h

# Get cluster URL
kubectl config view --minify --output jsonpath='{.clusters[0].cluster.server}'
```

### 3. Base64 Encoding (if needed)
```bash
# Encode secrets to base64 (if required by your k8s setup)
echo -n "your-secret-value" | base64
```

## 🔧 **Environment-Specific Configuration**

### **Production Environment**
```bash
# Database
PROD_DB_USER="pool_tracker_user"
PROD_DB_PASSWORD="$(openssl rand -base64 24)"
PROD_DB_NAME="pool_tracker_prod" 
PROD_MYSQL_ROOT_PASSWORD="$(openssl rand -base64 24)"

# Security
PROD_JWT_SECRET="$(openssl rand -base64 32)"
PROD_SESSION_SECRET="$(openssl rand -base64 32)"
```

## 📝 **Adding Secrets via GitHub CLI**

If you have GitHub CLI installed:

```bash
# Set repository (replace with your values)
REPO="epitech-nice/PoolTracker"

# Kubernetes secrets
gh secret set KUBERNETES_URL --repo $REPO --body "https://your-k8s-cluster.com:6443"
gh secret set KUBERNETES_SECRET --repo $REPO --body "your-base64-encoded-kubeconfig-or-token"

# Database secrets
gh secret set PROD_DB_USER --repo $REPO --body "pool_tracker_user"
gh secret set PROD_DB_PASSWORD --repo $REPO --body "your-secure-db-password"
gh secret set PROD_DB_NAME --repo $REPO --body "pool_tracker_prod"
gh secret set PROD_MYSQL_ROOT_PASSWORD --repo $REPO --body "your-secure-root-password"

# Application secrets
gh secret set PROD_JWT_SECRET --repo $REPO --body "your-32-char-jwt-secret"
gh secret set PROD_SESSION_SECRET --repo $REPO --body "your-session-secret"
```

## 🔒 **Security Best Practices**

### ✅ **DO:**
- Use strong, randomly generated passwords (24+ characters)
- Rotate secrets regularly (every 90 days)
- Use different secrets for different environments
- Store secrets only in GitHub Secrets (never in code)
- Use least-privilege Kubernetes service accounts
- Monitor secret usage in GitHub Actions logs

### ❌ **DON'T:**
- Commit secrets to version control
- Use default or weak passwords
- Share secrets via chat/email
- Use the same secrets across environments
- Log secret values in workflows

## 🧪 **Testing Secret Configuration**

### Verify Secrets in Workflow
The pipeline includes verification steps that will:
1. ✅ Test Kubernetes connectivity
2. ✅ Verify secret creation in cluster  
3. ✅ Check application startup with secrets
4. ✅ Run health checks

### Manual Verification
```bash
# Check if secrets exist in GitHub
gh secret list --repo epitech-nice/PoolTracker

# Test Kubernetes connectivity
kubectl cluster-info --context your-context

# Verify base64 encoding
echo "your-encoded-secret" | base64 -d
```

## 🔄 **Secret Rotation Procedure**

1. **Generate new secret values**
2. **Update GitHub Secrets**
3. **Trigger deployment workflow**
4. **Verify application functionality**
5. **Update any external references**

## 📞 **Troubleshooting**

### Common Issues:

**❌ "Invalid Kubernetes credentials"**
- Verify `KUBERNETES_URL` format
- Check `KUBERNETES_SECRET` is valid base64
- Ensure service account has proper permissions

**❌ "Database connection failed"**
- Verify database secrets are correct
- Check if database service is running
- Ensure network connectivity

**❌ "JWT verification failed"**
- Confirm `PROD_JWT_SECRET` is set
- Verify secret is at least 32 characters
- Check for encoding issues

### Debug Commands:
```bash
# View workflow logs
gh run list --repo epitech-nice/PoolTracker
gh run view [run-id] --log

# Check deployment status
kubectl get all -n pool-tracker-prod
kubectl describe pods -l app=pool-tracker -n pool-tracker-prod
```

## 🚀 **Ready to Deploy!**

Once all secrets are configured:

1. **Push to main branch** or **feature/deploy-prod**
2. **Monitor workflow** in Actions tab
3. **Verify deployment** at https://pool.nice-tek.eu
4. **Check logs** if issues occur

Your production deployment pipeline is now fully configured with secure secret management! 🎉