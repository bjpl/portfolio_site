# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Portfolio Site backend to production environments with Docker, Kubernetes, and traditional server setups.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher (optional but recommended)
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: 10GB+ available space
- **OS**: Ubuntu 20.04+, CentOS 8+, or Docker environment

### Required Software
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install Redis (optional)
sudo apt install redis-server

# Install PM2 for process management
npm install -g pm2

# Install Docker (for containerized deployment)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Environment
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security - CRITICAL: Change these values
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-256-bits
SESSION_SECRET=your-super-secure-session-secret-256-bits
ENCRYPTION_KEY=your-32-character-encryption-key

# Database
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_cms_prod
DB_USER=portfolio_user
DB_PASSWORD=your-secure-database-password
DB_SSL=true
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_KEY_PREFIX=portfolio:prod:

# CORS Configuration
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# Email (SMTP)
EMAIL_SERVICE=smtp
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
EMAIL_FROM_NAME=Your Portfolio
EMAIL_FROM_ADDRESS=noreply@your-domain.com

# File Storage
STORAGE_TYPE=local
UPLOADS_PATH=/var/www/portfolio/uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,svg,pdf,doc,docx

# Features
FEATURE_EMAIL_VERIFICATION=true
FEATURE_TWO_FACTOR_AUTH=true
FEATURE_ANALYTICS=true

# Monitoring
MONITORING_ENABLED=true
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
LOG_DIRECTORY=/var/log/portfolio

# API Configuration
API_DOCS_ENABLED=false
API_DEFAULT_LIMIT=20
API_MAX_LIMIT=100

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION=30
```

### Security Best Practices

1. **Generate Strong Secrets**:
```bash
# Generate JWT secrets
openssl rand -hex 32

# Generate encryption key
openssl rand -hex 16
```

2. **Database Security**:
```sql
-- Create dedicated database user
CREATE USER portfolio_user WITH PASSWORD 'your-secure-password';
CREATE DATABASE portfolio_cms_prod OWNER portfolio_user;
GRANT ALL PRIVILEGES ON DATABASE portfolio_cms_prod TO portfolio_user;
```

3. **File Permissions**:
```bash
# Set proper ownership
sudo chown -R www-data:www-data /var/www/portfolio
sudo chmod -R 755 /var/www/portfolio
sudo chmod -R 775 /var/www/portfolio/uploads
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production
RUN cd backend && npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

FROM node:18-alpine AS runtime

# Install security updates
RUN apk update && apk upgrade

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app ./

# Create necessary directories
RUN mkdir -p uploads logs
RUN chown -R nextjs:nodejs uploads logs

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=portfolio_cms_prod
      - POSTGRES_USER=portfolio_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads:/var/www/uploads
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:
  uploads:
  logs:

networks:
  app-network:
    driver: bridge
```

## Kubernetes Deployment

### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: portfolio-prod
```

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: portfolio-config
  namespace: portfolio-prod
data:
  NODE_ENV: "production"
  PORT: "3001"
  DB_DIALECT: "postgres"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: portfolio-secrets
  namespace: portfolio-prod
type: Opaque
stringData:
  JWT_SECRET: "your-jwt-secret"
  JWT_REFRESH_SECRET: "your-refresh-secret"
  DB_PASSWORD: "your-db-password"
  REDIS_PASSWORD: "your-redis-password"
```

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio-api
  namespace: portfolio-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: portfolio-api
  template:
    metadata:
      labels:
        app: portfolio-api
    spec:
      containers:
      - name: api
        image: your-registry/portfolio-api:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: portfolio-config
        - secretRef:
            name: portfolio-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: portfolio-uploads-pvc
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: portfolio-api-service
  namespace: portfolio-prod
spec:
  selector:
    app: portfolio-api
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portfolio-ingress
  namespace: portfolio-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.your-domain.com
    secretName: portfolio-tls
  rules:
  - host: api.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: portfolio-api-service
            port:
              number: 3001
```

## Traditional Server Deployment

### PM2 Ecosystem File
```javascript
module.exports = {
  apps: [{
    name: 'portfolio-api',
    script: './backend/src/server.js',
    cwd: '/var/www/portfolio',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/var/log/portfolio/combined.log',
    out_file: '/var/log/portfolio/out.log',
    error_file: '/var/log/portfolio/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Nginx Configuration
```nginx
upstream portfolio_api {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # File upload size
    client_max_body_size 50M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://portfolio_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static file serving
    location /uploads/ {
        alias /var/www/portfolio/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://portfolio_api;
    }
}
```

## Database Setup

### Initial Migration
```bash
# Install Sequelize CLI globally
npm install -g sequelize-cli

# Run migrations
npx sequelize-cli db:migrate --env production

# Seed initial data
npx sequelize-cli db:seed:all --env production
```

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_projects_status_visibility 
ON projects(status, visibility) WHERE status = 'published';

CREATE INDEX CONCURRENTLY idx_projects_featured 
ON projects(featured, created_at DESC) WHERE featured = true;

CREATE INDEX CONCURRENTLY idx_blog_posts_search 
USING gin(to_tsvector('english', title || ' ' || coalesce(excerpt, '') || ' ' || content));

-- Set up connection pooling
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

## Monitoring and Logging

### Log Rotation
```bash
# Create logrotate config
sudo tee /etc/logrotate.d/portfolio << EOF
/var/log/portfolio/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Health Monitoring
```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:3001/health || exit 1
```

### Backup Script
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/portfolio"

# Database backup
pg_dump -h localhost -U portfolio_user portfolio_cms_prod > "${BACKUP_DIR}/db_${DATE}.sql"

# File backup
tar -czf "${BACKUP_DIR}/uploads_${DATE}.tar.gz" /var/www/portfolio/uploads

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

## SSL Certificate Setup

### Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## Performance Tuning

### Node.js Optimization
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

### Database Tuning
```sql
-- PostgreSQL configuration recommendations
ALTER SYSTEM SET shared_buffers = '25% of RAM';
ALTER SYSTEM SET effective_cache_size = '75% of RAM';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET random_page_cost = 1.1;
```

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates obtained
- [ ] Backup procedures tested
- [ ] Monitoring systems ready
- [ ] Load balancer configured
- [ ] Security headers configured
- [ ] Rate limiting configured

### Post-deployment
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Cache system operational
- [ ] File uploads working
- [ ] Email notifications working
- [ ] Logging systems active
- [ ] Performance metrics baseline established

### Rollback Plan
1. Keep previous version deployment ready
2. Database migration rollback scripts
3. Traffic routing fallback
4. Monitoring alerts for issues

## Troubleshooting

### Common Issues

**Database Connection Errors**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

**Memory Issues**:
```bash
# Monitor memory usage
free -h
top -p $(pgrep -f "node.*server.js")
```

**File Permission Issues**:
```bash
# Fix upload directory permissions
sudo chown -R www-data:www-data /var/www/portfolio/uploads
sudo chmod -R 755 /var/www/portfolio/uploads
```

**SSL Certificate Issues**:
```bash
# Test SSL configuration
openssl s_client -connect api.your-domain.com:443
```

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# System resource monitoring
htop
iotop
```

This deployment guide provides a comprehensive approach to production deployment with multiple options for different infrastructure setups.