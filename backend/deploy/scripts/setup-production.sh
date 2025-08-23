#!/bin/bash

# Portfolio Backend Production Setup Script
# Sets up the production environment with all necessary configurations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Usage
show_usage() {
    cat << EOF
Usage: $0 [options]

Production setup script for Portfolio Backend

OPTIONS:
    --environment ENV       Environment to setup (staging|production) [default: production]
    --domain DOMAIN         Domain name for the application
    --email EMAIL           Email for SSL certificates
    --skip-ssl             Skip SSL certificate setup
    --skip-monitoring      Skip monitoring setup
    --help, -h             Show this help message

EXAMPLES:
    $0 --domain api.portfolio.com --email admin@portfolio.com
    $0 --environment staging --domain api-staging.portfolio.com

EOF
}

# Parse command line arguments
ENVIRONMENT="production"
DOMAIN=""
EMAIL=""
SKIP_SSL="false"
SKIP_MONITORING="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --skip-ssl)
            SKIP_SSL="true"
            shift
            ;;
        --skip-monitoring)
            SKIP_MONITORING="true"
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validation
if [[ -z "$DOMAIN" ]]; then
    log_error "Domain is required. Use --domain option."
    exit 1
fi

if [[ "$SKIP_SSL" == "false" ]] && [[ -z "$EMAIL" ]]; then
    log_error "Email is required for SSL certificates. Use --email option or --skip-ssl."
    exit 1
fi

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local required_commands=("kubectl" "helm" "docker" "openssl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace and basic resources
setup_kubernetes_namespace() {
    log_info "Setting up Kubernetes namespace..."
    
    kubectl apply -f "$DEPLOY_DIR/k8s/namespace.yaml"
    
    # Create service account if it doesn't exist
    cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: portfolio-backend
  namespace: portfolio-backend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: portfolio-backend
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets", "services"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: portfolio-backend
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: portfolio-backend
subjects:
- kind: ServiceAccount
  name: portfolio-backend
  namespace: portfolio-backend
EOF
    
    log_success "Kubernetes namespace configured"
}

# Generate and apply secrets
setup_secrets() {
    log_info "Setting up secrets..."
    
    # Generate random secrets
    local jwt_secret=$(openssl rand -base64 64 | tr -d '\n')
    local session_secret=$(openssl rand -base64 64 | tr -d '\n')
    local postgres_password=$(openssl rand -base64 32 | tr -d '\n')
    local redis_password=$(openssl rand -base64 32 | tr -d '\n')
    
    # Create secrets manifest
    cat << EOF > /tmp/portfolio-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: portfolio-backend-secrets
  namespace: portfolio-backend
type: Opaque
stringData:
  DB_PASSWORD: "$postgres_password"
  REDIS_PASSWORD: "$redis_password"
  JWT_SECRET: "$jwt_secret"
  SESSION_SECRET: "$session_secret"
  CORS_ORIGIN: "https://$DOMAIN"
  SMTP_HOST: "smtp.sendgrid.net"
  SMTP_USER: "apikey"
  SMTP_PASS: "REPLACE_WITH_SENDGRID_API_KEY"
  FROM_EMAIL: "noreply@$DOMAIN"
  FROM_NAME: "Portfolio Backend"
  SENTRY_DSN: "REPLACE_WITH_SENTRY_DSN"
  SENTRY_RELEASE: "1.0.0"
  CSP_REPORT_URI: "https://$DOMAIN/api/csp-report"
EOF
    
    kubectl apply -f /tmp/portfolio-secrets.yaml
    rm -f /tmp/portfolio-secrets.yaml
    
    log_success "Secrets configured"
    log_info "Please update the following secrets manually:"
    log_info "  - SMTP_PASS: Set your SendGrid API key"
    log_info "  - SENTRY_DSN: Set your Sentry DSN"
}

# Setup SSL certificates
setup_ssl_certificates() {
    if [[ "$SKIP_SSL" == "true" ]]; then
        log_warning "Skipping SSL certificate setup"
        return 0
    fi
    
    log_info "Setting up SSL certificates with cert-manager..."
    
    # Install cert-manager if not present
    if ! kubectl get crd certificates.cert-manager.io &> /dev/null; then
        log_info "Installing cert-manager..."
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
        
        # Wait for cert-manager to be ready
        kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager
        kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
        kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager-webhook -n cert-manager
    fi
    
    # Create Let's Encrypt issuer
    cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: $EMAIL
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    # Create staging issuer for testing
    cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: $EMAIL
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    log_success "SSL certificates configured"
}

# Setup ingress controller
setup_ingress_controller() {
    log_info "Setting up NGINX Ingress Controller..."
    
    # Check if ingress controller is already installed
    if kubectl get deployment ingress-nginx-controller -n ingress-nginx &> /dev/null; then
        log_info "NGINX Ingress Controller already installed"
        return 0
    fi
    
    # Install NGINX Ingress Controller
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
    
    # Wait for the ingress controller to be ready
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    log_success "NGINX Ingress Controller configured"
}

# Update ingress with correct domain
update_ingress() {
    log_info "Updating ingress configuration..."
    
    # Update the ingress file with correct domain
    sed "s/api.portfolio.yourdomain.com/$DOMAIN/g" "$DEPLOY_DIR/k8s/ingress.yaml" > /tmp/ingress-updated.yaml
    
    kubectl apply -f /tmp/ingress-updated.yaml
    rm -f /tmp/ingress-updated.yaml
    
    log_success "Ingress configuration updated"
}

# Setup monitoring stack
setup_monitoring() {
    if [[ "$SKIP_MONITORING" == "true" ]]; then
        log_warning "Skipping monitoring setup"
        return 0
    fi
    
    log_info "Setting up monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Add Prometheus Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install Prometheus
    if ! helm list -n monitoring | grep -q prometheus; then
        log_info "Installing Prometheus..."
        helm install prometheus prometheus-community/kube-prometheus-stack \
            --namespace monitoring \
            --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
            --set prometheus.prometheusSpec.retention=30d \
            --set grafana.adminPassword=admin123 \
            --set alertmanager.enabled=true
    fi
    
    # Create service monitor for the application
    cat << EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: portfolio-backend
  namespace: monitoring
  labels:
    app: portfolio-backend
spec:
  selector:
    matchLabels:
      app: portfolio-backend
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
EOF
    
    log_success "Monitoring stack configured"
}

# Setup storage classes
setup_storage() {
    log_info "Setting up storage classes..."
    
    # Create fast SSD storage class (adjust based on cloud provider)
    cat << EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
    
    log_success "Storage classes configured"
}

# Setup database
setup_database() {
    log_info "Setting up PostgreSQL database..."
    
    # Create PostgreSQL deployment
    cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: portfolio-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      component: database
  template:
    metadata:
      labels:
        app: postgres
        component: database
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: portfolio_production
        - name: POSTGRES_USER
          value: portfolio_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: portfolio-backend-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-data-pvc
EOF
    
    log_success "PostgreSQL database configured"
}

# Setup Redis
setup_redis() {
    log_info "Setting up Redis cache..."
    
    # Create Redis deployment
    cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: portfolio-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
      component: cache
  template:
    metadata:
      labels:
        app: redis
        component: cache
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server"]
        args: ["--requirepass", "\$(REDIS_PASSWORD)", "--appendonly", "yes"]
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: portfolio-backend-secrets
              key: REDIS_PASSWORD
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-data-pvc
EOF
    
    log_success "Redis cache configured"
}

# Main setup function
main() {
    log_info "Starting production setup for Portfolio Backend"
    log_info "Environment: $ENVIRONMENT"
    log_info "Domain: $DOMAIN"
    log_info "Email: $EMAIL"
    
    check_prerequisites
    setup_kubernetes_namespace
    setup_storage
    setup_secrets
    setup_ingress_controller
    setup_ssl_certificates
    
    # Apply storage claims
    kubectl apply -f "$DEPLOY_DIR/k8s/pvc.yaml"
    
    setup_database
    setup_redis
    
    # Apply ConfigMap
    kubectl apply -f "$DEPLOY_DIR/k8s/configmap.yaml"
    
    update_ingress
    setup_monitoring
    
    log_success "Production setup completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Update secrets in Kubernetes with actual values"
    log_info "2. Build and push your Docker image"
    log_info "3. Deploy the application using: kubectl apply -f $DEPLOY_DIR/k8s/deployment.yaml"
    log_info "4. Apply HPA: kubectl apply -f $DEPLOY_DIR/k8s/hpa.yaml"
    log_info "5. Check application status: kubectl get pods -n portfolio-backend"
    log_info ""
    log_info "Useful commands:"
    log_info "  kubectl get secrets -n portfolio-backend"
    log_info "  kubectl logs -f deployment/portfolio-backend -n portfolio-backend"
    log_info "  kubectl get ingress -n portfolio-backend"
}

# Run main function
main "$@"