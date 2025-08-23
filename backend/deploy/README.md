# Portfolio Backend Deployment Guide

This directory contains comprehensive deployment configurations for the Portfolio Backend application across different environments and platforms.

## 📁 Directory Structure

```
deploy/
├── env/                    # Environment configurations
│   ├── .env.development   # Development environment variables
│   ├── .env.staging       # Staging environment variables
│   └── .env.production    # Production environment variables
├── docker/                # Docker configurations
│   ├── Dockerfile.production        # Multi-stage production Dockerfile
│   ├── docker-compose.development.yml  # Development compose
│   └── docker-compose.production.yml   # Production compose
├── k8s/                   # Kubernetes manifests
│   ├── namespace.yaml     # Kubernetes namespace
│   ├── configmap.yaml     # Configuration maps
│   ├── secret.yaml        # Secrets (template)
│   ├── deployment.yaml    # Application deployment
│   ├── service.yaml       # Kubernetes services
│   ├── ingress.yaml       # Ingress configuration
│   ├── hpa.yaml          # Horizontal Pod Autoscaler
│   └── pvc.yaml          # Persistent Volume Claims
├── cloud/                 # Cloud platform configurations
│   ├── vercel.json       # Vercel deployment
│   ├── railway.toml      # Railway deployment
│   └── render.yaml       # Render deployment
├── monitoring/            # Monitoring and logging
│   ├── winston.config.js  # Logging configuration
│   ├── sentry.config.js   # Error tracking
│   ├── health-checks.js   # Health check system
│   └── prometheus.config.js # Metrics collection
├── scripts/               # Deployment automation
│   ├── deploy.sh         # Main deployment script
│   ├── backup.sh         # Backup automation
│   └── setup-production.sh # Production setup
└── README.md             # This file
```

## 🚀 Quick Start

### 1. Local Development

```bash
# Using Docker Compose
cd backend/deploy/docker
cp ../env/.env.development .env
docker-compose -f docker-compose.development.yml up

# Direct Node.js
cd backend
cp deploy/env/.env.development .env
npm install
npm run dev
```

### 2. Production Deployment

#### Kubernetes (Recommended)
```bash
# Setup production environment
cd backend/deploy/scripts
chmod +x setup-production.sh deploy.sh
./setup-production.sh --domain api.yoursite.com --email admin@yoursite.com

# Deploy application
./deploy.sh production
```

#### Docker Compose
```bash
cd backend/deploy/docker
cp ../env/.env.production .env
# Edit .env with your production values
docker-compose -f docker-compose.production.yml up -d
```

#### Cloud Platforms
```bash
# Vercel
vercel deploy --prod

# Railway
railway up

# Render
# Push to connected Git repository
```

## 📋 Environment Configuration

### Required Environment Variables

#### Database
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

#### Redis Cache
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password

#### Security
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session encryption secret
- `CORS_ORIGIN` - Allowed CORS origins

#### External Services
- `SENTRY_DSN` - Sentry error tracking DSN
- `SMTP_HOST` - Email SMTP host
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password

### Environment Files

1. **Development** (`env/.env.development`)
   - Local development with relaxed security
   - Debug logging enabled
   - SQLite/PostgreSQL local database

2. **Staging** (`env/.env.staging`)
   - Production-like environment for testing
   - Reduced resource limits
   - Staging-specific configurations

3. **Production** (`env/.env.production`)
   - High security and performance settings
   - Full resource allocation
   - Production monitoring and logging

## 🐳 Docker Deployment

### Multi-stage Dockerfile

The production Dockerfile uses multi-stage builds:

- **Base**: Common dependencies and user setup
- **Development**: Development dependencies and hot-reload
- **Build**: Production build and optimization
- **Production**: Minimal runtime environment

### Features

- Non-root user execution
- Health checks
- Security scanning
- Optimized layers
- Multi-architecture support (amd64, arm64)

## ☸️ Kubernetes Deployment

### Architecture

- **Namespace**: `portfolio-backend`
- **Replicas**: 3 (auto-scaling 3-10)
- **Resources**: CPU/Memory limits and requests
- **Storage**: Persistent volumes for data
- **Networking**: Ingress with SSL termination

### Security Features

- RBAC with minimal permissions
- Pod security contexts
- Network policies
- Secret management
- SSL/TLS encryption

### Monitoring

- Prometheus metrics
- Grafana dashboards
- Loki log aggregation
- Jaeger distributed tracing

## 📊 Monitoring & Logging

### Winston Logging

- Structured JSON logs
- Log rotation and retention
- Multiple transport levels
- Performance logging
- Audit trail logging

### Sentry Error Tracking

- Automatic error capture
- Performance monitoring
- Release tracking
- User context
- Custom error handling

### Health Checks

- Liveness probes
- Readiness probes
- Database connectivity
- External service checks
- Custom health metrics

### Prometheus Metrics

- HTTP request metrics
- Database query performance
- Cache hit/miss rates
- Business metrics
- Error rates

## 🚨 CI/CD Pipeline

### GitHub Actions Workflow

1. **Code Quality**
   - Linting and formatting
   - Unit and integration tests
   - Security scanning
   - Test coverage

2. **Build & Push**
   - Multi-stage Docker build
   - Container registry push
   - Image signing
   - Vulnerability scanning

3. **Deploy**
   - Environment-specific deployment
   - Health checks
   - Rollback on failure
   - Notifications

### Pipeline Features

- Parallel execution
- Caching optimization
- Environment promotion
- Automated rollbacks
- Slack notifications

## 🔒 Security

### Application Security

- Helmet.js security headers
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

### Infrastructure Security

- Non-root containers
- Read-only root filesystem
- Network policies
- Secret management
- SSL/TLS encryption

### Monitoring Security

- Failed authentication tracking
- Rate limit violations
- Suspicious activity alerts
- Security event logging

## 📈 Performance

### Optimization Features

- Response compression
- Database connection pooling
- Redis caching
- Static asset optimization
- CDN integration

### Scaling

- Horizontal Pod Autoscaler (HPA)
- Database read replicas
- Cache layers
- Load balancing
- Resource limits

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection**
   ```bash
   kubectl logs deployment/postgres -n portfolio-backend
   kubectl exec -it deployment/portfolio-backend -n portfolio-backend -- pg_isready
   ```

2. **Redis Connection**
   ```bash
   kubectl exec -it deployment/redis -n portfolio-backend -- redis-cli ping
   ```

3. **Application Logs**
   ```bash
   kubectl logs -f deployment/portfolio-backend -n portfolio-backend
   ```

4. **Health Checks**
   ```bash
   curl https://api.yoursite.com/api/health
   ```

### Debug Commands

```bash
# Check pod status
kubectl get pods -n portfolio-backend

# Describe deployment
kubectl describe deployment portfolio-backend -n portfolio-backend

# Check ingress
kubectl get ingress -n portfolio-backend

# View events
kubectl get events -n portfolio-backend --sort-by='.lastTimestamp'
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Prometheus Monitoring](https://prometheus.io/docs/guides/node-exporter/)

## 🤝 Support

For deployment issues or questions:

1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Contact the development team

---

**Note**: Remember to update secrets, domain names, and service endpoints before deploying to production.