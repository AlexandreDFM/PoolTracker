# 🔒 SSL/TLS Certificate Management for PoolTracker Pods

This guide explains how to add and manage SSL/TLS certificates in your PoolTracker Kubernetes pods for secure internal communications.

## 📋 **Overview**

The certificate system provides:
- ✅ **Pod-level SSL/TLS encryption** for internal communications
- ✅ **Automatic certificate mounting** into containers
- ✅ **Enhanced nginx configuration** with HTTPS support
- ✅ **Certificate lifecycle management**
- ✅ **Integration with existing Traefik ingress SSL**

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Traefik       │    │   Pod Certificates │    │   Application   │
│   (Let's Encrypt)│───▶│   (Self-signed)    │───▶│   (Internal SSL)│
│   External SSL   │    │   Internal SSL     │    │   Node.js + nginx│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   HTTPS Ingress          Certificate Secret      /etc/ssl/certs/
 pool.nice-tek.eu         pool-tracker-tls-cert   tls.crt + tls.key
```

## 📁 **Files Created**

### **Kubernetes Resources:**
- **`certificates.yaml`** - Certificate secrets and configuration
- **`manage-certificates.sh`** - Certificate management script

### **Application Updates:**
- **`deployment.yaml`** - Volume mounts for certificates
- **`docker/nginx/default.conf`** - Enhanced nginx with SSL support
- **`docker/start.sh`** - SSL-aware startup script
- **`Dockerfile`** - SSL directory preparation

## 🚀 **Quick Start**

### **1. Deploy Certificates**
```bash
# Navigate to kubernetes directory
cd deploy/kubernetes

# Install certificates (generates self-signed certs)
./manage-certificates.sh install

# Check status
./manage-certificates.sh status
```

### **2. Verify Installation**
```bash
# Check pod certificate mounting
kubectl exec -it deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- ls -la /etc/ssl/certs/

# Test SSL endpoint (if HTTPS is configured)
kubectl port-forward service/pool-tracker-service-prod 8443:443 -n pool-tracker-prod
curl -k https://localhost:8443/ssl-health
```

## 🔧 **Certificate Management**

### **Available Commands**
```bash
./manage-certificates.sh install    # Generate and install new certificate
./manage-certificates.sh status     # Show certificate status
./manage-certificates.sh verify     # Verify certificate installation  
./manage-certificates.sh restart    # Restart pods to reload certificates
./manage-certificates.sh cleanup    # Remove certificate resources
```

### **Certificate Properties**
- **Type**: Self-signed X.509 certificate
- **Key Size**: 2048-bit RSA
- **Validity**: 365 days
- **Domains**: 
  - `pool.nice-tek.eu`
  - `www.pool.nice-tek.eu`
  - `localhost`
  - `*.pool-tracker-prod.svc.cluster.local`

### **Certificate Locations in Pods**
```
/etc/ssl/certs/tls.crt     # Certificate file (mode: 0644)
/etc/ssl/private/tls.key   # Private key (mode: 0600)  
/etc/ssl/config/ssl.conf   # SSL configuration
```

## 🔐 **Security Features**

### **SSL/TLS Configuration**
- ✅ **TLS 1.2 and 1.3** protocols only
- ✅ **Strong cipher suites** (ECDHE-based)
- ✅ **Perfect Forward Secrecy** (PFS)
- ✅ **HSTS headers** for security
- ✅ **Proper file permissions** (600 for keys, 644 for certs)

### **Security Headers**
```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
```

## 🔄 **Integration with GitHub Actions**

The certificate setup is integrated into your deployment pipeline:

```yaml
- name: Setup SSL Certificates
  run: |
      chmod +x deploy/kubernetes/manage-certificates.sh
      cd deploy/kubernetes
      ./manage-certificates.sh install
      ./manage-certificates.sh verify
```

**Pipeline Steps:**
1. 🔨 Build Docker image with SSL support
2. 🚀 Deploy to Kubernetes
3. 🔒 Generate and mount certificates
4. ✅ Verify certificate installation
5. 🔍 Health check with SSL endpoints

## 📊 **Monitoring Certificate Health**

### **Check Certificate Expiry**
```bash
# View certificate details
kubectl get secret pool-tracker-tls-cert -n pool-tracker-prod -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout

# Check expiry date
kubectl get secret pool-tracker-tls-cert -n pool-tracker-prod -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -enddate
```

### **Pod SSL Status**
```bash
# Check if SSL is enabled in pods
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  printenv SSL_ENABLED

# Test SSL endpoint from inside pod
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  curl -k https://localhost/ssl-health
```

### **Nginx SSL Configuration Test**
```bash
# Test nginx configuration
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  nginx -t

# Check SSL configuration
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  cat /etc/ssl/config/ssl.conf
```

## 🔄 **Certificate Rotation**

### **Automatic Rotation**
Certificates should be rotated before expiry:

```bash
# Check current expiry
./manage-certificates.sh status

# Generate new certificate (90 days before expiry)
./manage-certificates.sh install

# Pods will automatically restart with new certificates
```

### **Manual Rotation**
```bash
# Force certificate regeneration
kubectl delete secret pool-tracker-tls-cert -n pool-tracker-prod
./manage-certificates.sh install

# Verify new certificate
./manage-certificates.sh verify
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **❌ Certificate Not Mounted**
```bash
# Check volume mounts in deployment
kubectl describe deployment pool-tracker-deployment-prod -n pool-tracker-prod

# Check pod events
kubectl get events -n pool-tracker-prod --field-selector involvedObject.kind=Pod
```

#### **❌ SSL Configuration Error**
```bash
# Check nginx logs
kubectl logs deployment/pool-tracker-deployment-prod -n pool-tracker-prod

# Test nginx configuration
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- nginx -t
```

#### **❌ Permission Issues**
```bash
# Check file permissions in pod
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  ls -la /etc/ssl/certs/ /etc/ssl/private/

# Fix permissions (automatic in startup script)
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  /app/start.sh
```

### **Debug Commands**
```bash
# Complete SSL status check
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  sh -c 'echo "=== SSL Files ===" && ls -la /etc/ssl/*/; echo "=== Nginx Status ===" && nginx -t; echo "=== SSL Env ===" && printenv SSL_ENABLED'

# View certificate details from pod
kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- \
  openssl x509 -in /etc/ssl/certs/tls.crt -text -noout
```

## 🔗 **Integration with External SSL**

Your setup now has **layered SSL security**:

1. **🌐 External SSL (Traefik + Let's Encrypt)**:
   - Handles public HTTPS traffic
   - Automatic certificate renewal
   - Domain: `pool.nice-tek.eu`

2. **🔒 Internal SSL (Pod Certificates)**:
   - Secures internal pod communications
   - Self-signed certificates
   - Used for service-to-service encryption

### **Traffic Flow**
```
Internet → Traefik (Let's Encrypt SSL) → Pod (Internal SSL) → Application
  HTTPS              HTTPS                    HTTPS            HTTP/HTTPS
```

## 📈 **Performance Considerations**

### **SSL Overhead**
- **CPU Impact**: ~5-10% for SSL termination
- **Memory**: Additional 10-20MB for SSL buffers
- **Latency**: ~1-2ms additional per request

### **Optimization**
- ✅ **Session caching** enabled (10m timeout)
- ✅ **SSL session tickets** disabled for security
- ✅ **OCSP stapling** configured
- ✅ **Perfect Forward Secrecy** enabled

## 🎯 **Best Practices**

### **✅ DO:**
- Rotate certificates every 90 days
- Monitor certificate expiry dates
- Use strong ciphers and protocols
- Keep private keys secure (600 permissions)
- Test SSL configuration after updates

### **❌ DON'T:**
- Commit private keys to version control
- Use weak or expired certificates
- Disable SSL verification in production
- Share certificates between environments
- Ignore certificate expiry warnings

## 📞 **Support**

### **Certificate Issues:**
1. Check certificate status: `./manage-certificates.sh status`
2. Verify pod mounting: `./manage-certificates.sh verify`
3. Review pod logs: `kubectl logs -f deployment/pool-tracker-deployment-prod -n pool-tracker-prod`
4. Test SSL configuration: `kubectl exec deployment/pool-tracker-deployment-prod -n pool-tracker-prod -- nginx -t`

### **Emergency Certificate Refresh:**
```bash
# Quick certificate refresh
./manage-certificates.sh cleanup
./manage-certificates.sh install
kubectl rollout restart deployment/pool-tracker-deployment-prod -n pool-tracker-prod
```

Your PoolTracker application now has comprehensive SSL/TLS certificate support at the pod level! 🔒✨
