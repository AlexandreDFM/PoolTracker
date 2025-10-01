#!/bin/bash
#
# Certificate Management Script for PoolTracker
# Generates and applies SSL/TLS certificates to Kubernetes pods
#

set -e

# Configuration
NAMESPACE="pool-tracker-prod"
DOMAIN="pool.nice-tek.eu"
ALT_DOMAIN="www.pool.nice-tek.eu"
CERT_SECRET="pool-tracker-tls-cert"
CERT_VALIDITY_DAYS=365

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi

    if ! command -v openssl &> /dev/null; then
        print_error "openssl is not installed"
        exit 1
    fi

    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Function to generate self-signed certificate
generate_self_signed_cert() {
    print_status "Generating self-signed certificate..."

    local temp_dir=$(mktemp -d)
    local key_file="$temp_dir/tls.key"
    local csr_file="$temp_dir/tls.csr"
    local cert_file="$temp_dir/tls.crt"

    # Generate private key
    openssl genrsa -out "$key_file" 2048

    # Create certificate signing request
    openssl req -new -key "$key_file" -out "$csr_file" -subj "/CN=$DOMAIN/O=PoolTracker/C=FR/ST=Provence-Alpes-Cote-d-Azur/L=Nice"

    # Create extensions file
    cat > "$temp_dir/extensions.conf" << EOF
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = $ALT_DOMAIN
DNS.3 = localhost
DNS.4 = *.pool-tracker-prod.svc.cluster.local
DNS.5 = pool-tracker-service-prod.pool-tracker-prod.svc.cluster.local
IP.1 = 127.0.0.1
IP.2 = 10.0.0.1
EOF

    # Generate certificate
    openssl x509 -req -in "$csr_file" -signkey "$key_file" -out "$cert_file" \
        -days $CERT_VALIDITY_DAYS -extensions v3_req -extfile "$temp_dir/extensions.conf"

    print_success "Certificate generated successfully"

    # Store paths for later use
    export CERT_KEY_PATH="$key_file"
    export CERT_CRT_PATH="$cert_file"
    export TEMP_CERT_DIR="$temp_dir"

    # Display certificate info
    print_status "Certificate information:"
    openssl x509 -in "$cert_file" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before|Not After)"
}

# Function to create Kubernetes secret
create_k8s_secret() {
    print_status "Creating Kubernetes TLS secret..."

    # Delete existing secret if it exists
    kubectl delete secret $CERT_SECRET -n $NAMESPACE --ignore-not-found=true

    # Create new secret
    kubectl create secret tls $CERT_SECRET -n $NAMESPACE \
        --cert="$CERT_CRT_PATH" \
        --key="$CERT_KEY_PATH"

    # Add labels
    kubectl label secret $CERT_SECRET -n $NAMESPACE \
        app=pool-tracker \
        environment=production \
        component=tls-certificate

    print_success "Kubernetes secret created: $CERT_SECRET"
}

# Function to apply certificate configuration
apply_cert_config() {
    print_status "Applying certificate configuration..."

    kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: pool-tracker-cert-config
  namespace: $NAMESPACE
  labels:
    app: pool-tracker
    environment: production
data:
  ssl.conf: |
    # SSL Configuration for nginx
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security improvements
    ssl_buffer_size 8k;
    ssl_dhparam /etc/ssl/certs/dhparam.pem;

  dhparam.pem: |
    # Generate with: openssl dhparam -out dhparam.pem 2048
    -----BEGIN DH PARAMETERS-----
    MIIBCAKCAQEA7+wz1RFFwVSg9T6FfoVCXitr/EdPcK1sYe5nF8QJGMQYSq2fRMrQ
    gL3m8LVVVS5eUVqONQ+qFEiN9DCm0CodIXKaZ3h7DKvAS+pGKjm9fhJ9W+dHNuyI
    xVLLf4PvckO6QOjeN8kX1MqHKhwgQLJ1U5h8yLHJC9cjEKN4FE/wmpYLSjXCyNEV
    Sc2jJKVbrHw6A5mZXBZ6HJAlpyKh7RrAl6Jj0qTPonOMUTb1kV8x9f3IqnYqSY
    koT6qSXgWFYZ+mEzlYEn7YLt1KrE3F5Lq5n6XYJzTBYAcFAUxEqboHrN9r7DYRl
    V5zR9D5Y+U7L4HCLdgM+xZ2Q+U2Y1QGR8w8B6wIBAg==
    -----END DH PARAMETERS-----
EOF

    print_success "Certificate configuration applied"
}

# Function to restart pods to pick up new certificates
restart_pods() {
    print_status "Restarting pods to apply new certificates..."

    # Restart deployment to pick up new certificates
    kubectl rollout restart deployment/pool-tracker-deployment-prod -n $NAMESPACE

    # Wait for rollout to complete
    kubectl rollout status deployment/pool-tracker-deployment-prod -n $NAMESPACE --timeout=300s

    print_success "Pod restart completed"
}

# Function to verify certificate installation
verify_certificate() {
    print_status "Verifying certificate installation..."

    # Check if secret exists and has correct data
    if kubectl get secret $CERT_SECRET -n $NAMESPACE &> /dev/null; then
        print_success "Certificate secret exists"

        # Check certificate expiry
        local cert_data=$(kubectl get secret $CERT_SECRET -n $NAMESPACE -o jsonpath='{.data.tls\.crt}')
        local expiry_date=$(echo "$cert_data" | base64 -d | openssl x509 -noout -enddate | cut -d= -f2)
        print_status "Certificate expires: $expiry_date"

        # Check if pods have mounted the certificate
        local pod_names=$(kubectl get pods -l app=pool-tracker -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
        for pod in $pod_names; do
            if kubectl exec $pod -n $NAMESPACE -- test -f /etc/ssl/certs/tls.crt 2>/dev/null; then
                print_success "Certificate mounted in pod: $pod"
            else
                print_warning "Certificate not found in pod: $pod"
            fi
        done
    else
        print_error "Certificate secret not found"
        return 1
    fi
}

# Function to cleanup temporary files
cleanup() {
    if [[ -n "${TEMP_CERT_DIR:-}" && -d "$TEMP_CERT_DIR" ]]; then
        rm -rf "$TEMP_CERT_DIR"
        print_status "Temporary files cleaned up"
    fi
}

# Function to show certificate status
show_status() {
    print_status "Certificate Status:"
    echo ""

    # Check secret
    if kubectl get secret $CERT_SECRET -n $NAMESPACE &> /dev/null; then
        echo "✅ Certificate secret exists"
        local cert_data=$(kubectl get secret $CERT_SECRET -n $NAMESPACE -o jsonpath='{.data.tls\.crt}')
        local expiry_date=$(echo "$cert_data" | base64 -d | openssl x509 -noout -enddate | cut -d= -f2)
        echo "📅 Expires: $expiry_date"

        # Check domains in certificate
        echo "🌐 Certificate domains:"
        echo "$cert_data" | base64 -d | openssl x509 -noout -text | grep -A1 "Subject Alternative Name" | tail -1
    else
        echo "❌ Certificate secret not found"
    fi

    # Check pods
    echo ""
    echo "Pod Status:"
    kubectl get pods -l app=pool-tracker -n $NAMESPACE
}

# Main function
main() {
    case "${1:-install}" in
        "install"|"generate")
            print_status "Installing new certificate for PoolTracker..."
            check_prerequisites
            generate_self_signed_cert
            create_k8s_secret
            apply_cert_config
            restart_pods
            verify_certificate
            cleanup
            print_success "🎉 Certificate installation completed successfully!"
            ;;
        "status")
            show_status
            ;;
        "verify")
            check_prerequisites
            verify_certificate
            ;;
        "restart")
            check_prerequisites
            restart_pods
            ;;
        "cleanup")
            kubectl delete secret $CERT_SECRET -n $NAMESPACE --ignore-not-found=true
            kubectl delete configmap pool-tracker-cert-config -n $NAMESPACE --ignore-not-found=true
            print_success "Certificate resources cleaned up"
            ;;
        "help"|*)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  install    Generate and install new certificate (default)"
            echo "  generate   Same as install"
            echo "  status     Show certificate status"
            echo "  verify     Verify certificate installation"
            echo "  restart    Restart pods to reload certificates"
            echo "  cleanup    Remove certificate resources"
            echo "  help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Install new certificate"
            echo "  $0 install           # Install new certificate"
            echo "  $0 status            # Check certificate status"
            echo "  $0 verify            # Verify installation"
            ;;
    esac
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
