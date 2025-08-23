#!/bin/bash

# Portfolio Backend Deployment Script
# Usage: ./deploy.sh [environment] [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"

# Default values
ENVIRONMENT="${1:-staging}"
DRY_RUN="${2:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"
ROLLBACK="${ROLLBACK:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage information
show_usage() {
    cat << EOF
Usage: $0 [environment] [dry-run]

Deployment script for Portfolio Backend

ARGUMENTS:
    environment     Target environment (staging, production) [default: staging]
    dry-run         Run in dry-run mode (true/false) [default: false]

ENVIRONMENT VARIABLES:
    SKIP_TESTS      Skip running tests [default: false]
    SKIP_BUILD      Skip building Docker image [default: false]
    FORCE_DEPLOY    Force deployment even if checks fail [default: false]
    ROLLBACK        Rollback to previous version [default: false]

EXAMPLES:
    $0 staging                    # Deploy to staging
    $0 production true            # Dry run production deployment
    SKIP_TESTS=true $0 staging    # Deploy to staging without tests

EOF
}

# Validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        staging|production)
            log_info "Deploying to $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments: staging, production"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("docker" "kubectl" "helm" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "Script must be run from project root or deploy directory"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Load environment configuration
load_environment_config() {
    local env_file="$DEPLOY_DIR/env/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment configuration from $env_file"
        set -a
        source "$env_file"
        set +a
    else
        log_warning "Environment file not found: $env_file"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests"
        return 0
    fi
    
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm ci --prefer-offline --no-audit
    fi
    
    # Run linting
    log_info "Running linting..."
    npm run lint
    
    # Run unit tests
    log_info "Running unit tests..."
    npm run test:unit
    
    # Run integration tests
    log_info "Running integration tests..."
    npm run test:integration
    
    log_success "All tests passed"
}

# Build Docker image
build_docker_image() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_warning "Skipping Docker image build"
        return 0
    fi
    
    log_info "Building Docker image..."
    
    local image_name="portfolio-backend"
    local image_tag="${ENVIRONMENT}-$(git rev-parse --short HEAD)"
    local full_image_name="${image_name}:${image_tag}"
    
    cd "$PROJECT_ROOT"
    
    # Build image
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would build Docker image: $full_image_name"
    else
        docker build \
            -f "$DEPLOY_DIR/docker/Dockerfile.production" \
            -t "$full_image_name" \
            --target production \
            .
        
        # Tag as latest for environment
        docker tag "$full_image_name" "${image_name}:${ENVIRONMENT}-latest"
        
        log_success "Docker image built: $full_image_name"
    fi
    
    # Export image name for later use
    export DOCKER_IMAGE_NAME="$full_image_name"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    local k8s_dir="$DEPLOY_DIR/k8s"
    local namespace="portfolio-backend"
    
    cd "$k8s_dir"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would deploy to Kubernetes"
        kubectl apply --dry-run=client -f .
        return 0
    fi
    
    # Apply namespace first
    kubectl apply -f namespace.yaml
    
    # Apply secrets and configmaps
    kubectl apply -f secret.yaml
    kubectl apply -f configmap.yaml
    
    # Apply storage
    kubectl apply -f pvc.yaml
    
    # Update deployment with new image
    if [[ -n "${DOCKER_IMAGE_NAME:-}" ]]; then
        sed -i.bak "s|portfolio-backend:latest|${DOCKER_IMAGE_NAME}|g" deployment.yaml
    fi
    
    # Apply services first
    kubectl apply -f service.yaml
    
    # Apply deployment
    kubectl apply -f deployment.yaml
    
    # Apply HPA and ingress
    kubectl apply -f hpa.yaml
    kubectl apply -f ingress.yaml
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/portfolio-backend -n "$namespace" --timeout=600s
    
    # Restore original deployment file
    if [[ -f "deployment.yaml.bak" ]]; then
        mv deployment.yaml.bak deployment.yaml
    fi
    
    log_success "Kubernetes deployment completed"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local health_endpoint
    case "$ENVIRONMENT" in
        staging)
            health_endpoint="https://api-staging.portfolio.yourdomain.com/api/health"
            ;;
        production)
            health_endpoint="https://api.portfolio.yourdomain.com/api/health"
            ;;
    esac
    
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        if curl -f -s "$health_endpoint" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "Health check failed, retrying in 30 seconds..."
            sleep 30
        fi
        
        ((attempt++))
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Rollback deployment
rollback_deployment() {
    log_info "Rolling back deployment..."
    
    local namespace="portfolio-backend"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would rollback deployment"
        kubectl rollout history deployment/portfolio-backend -n "$namespace"
        return 0
    fi
    
    # Rollback to previous version
    kubectl rollout undo deployment/portfolio-backend -n "$namespace"
    
    # Wait for rollback to complete
    kubectl rollout status deployment/portfolio-backend -n "$namespace" --timeout=300s
    
    log_success "Rollback completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local emoji
        case "$status" in
            success) emoji=":white_check_mark:" ;;
            failure) emoji=":x:" ;;
            warning) emoji=":warning:" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji Portfolio Backend Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
}

# Cleanup on exit
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
        send_notification "failure" "Deployment to $ENVIRONMENT failed"
    fi
}

# Main deployment function
main() {
    # Set up cleanup trap
    trap cleanup EXIT
    
    log_info "Starting deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Dry run: $DRY_RUN"
    
    # Show usage if requested
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    # Handle rollback
    if [[ "$ROLLBACK" == "true" ]]; then
        validate_environment
        check_prerequisites
        rollback_deployment
        send_notification "success" "Rollback to $ENVIRONMENT completed"
        log_success "Rollback completed successfully"
        exit 0
    fi
    
    # Normal deployment flow
    validate_environment
    check_prerequisites
    load_environment_config
    
    # Pre-deployment checks
    if [[ "$FORCE_DEPLOY" != "true" ]]; then
        run_tests
    else
        log_warning "Forcing deployment without tests"
    fi
    
    # Build and deploy
    build_docker_image
    deploy_to_kubernetes
    
    # Post-deployment checks
    if ! run_health_checks; then
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            log_error "Health checks failed, rolling back..."
            rollback_deployment
            send_notification "failure" "Deployment to $ENVIRONMENT failed health checks and was rolled back"
            exit 1
        else
            log_warning "Health checks failed but deployment forced"
        fi
    fi
    
    # Success
    send_notification "success" "Deployment to $ENVIRONMENT completed successfully"
    log_success "Deployment completed successfully"
}

# Run main function
main "$@"