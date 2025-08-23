# Deployment and Configuration Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [Cloud Platform Deployments](#cloud-platform-deployments)
6. [Configuration Management](#configuration-management)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Database Configuration](#database-configuration)
9. [Monitoring Setup](#monitoring-setup)
10. [Backup Configuration](#backup-configuration)

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04 LTS / CentOS 8 / Windows Server 2019

#### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: 100 Mbps

### Software Dependencies

```bash
# Core dependencies
Node.js: v20.x LTS
npm: v10.x
Hugo: v0.120+
Git: v2.x

# Database
PostgreSQL: v15+
Redis: v7+

# Optional
Docker: v24+
nginx: v1.24+
PM2: v5+
```

### Installation Commands

#### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Hugo
wget https://github.com/gohugoio/hugo/releases/download/v0.120.0/hugo_extended_0.120.0_linux-amd64.deb
sudo dpkg -i hugo_extended_0.120.0_linux-amd64.deb

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

#### macOS
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node
brew install hugo
brew install postgresql
brew install redis
brew install nginx
npm install -g pm2
```

#### Windows
```powershell
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install dependencies
choco install nodejs
choco install hugo-extended
choco install postgresql
choco install redis
choco install nginx
npm install -g pm2
```

## Environment Setup

### Environment Variables

Create a `.env` file in the project root:

```bash
# Application Settings
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BASE_URL=https://yoursite.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_db
DB_USER=portfolio_user
DB_PASSWORD=secure_password_here
DB_SSL=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here

# Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@yoursite.com

# Storage
STORAGE_TYPE=s3 # or 'local'
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET=portfolio-media

# CDN Configuration
CDN_URL=https://cdn.yoursite.com
CLOUDFLARE_API_KEY=your_cloudflare_key
CLOUDFLARE_ZONE_ID=your_zone_id

# Monitoring
SENTRY_DSN=https://your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_new_relic_key

# Hugo Configuration
HUGO_ENV=production
HUGO_BASE_URL=https://yoursite.com
```

### Directory Structure Setup

```bash
# Create necessary directories
mkdir -p {logs,uploads,backups,cache,temp}
mkdir -p public/{images,css,js,media}
mkdir -p backend/{logs,uploads}

# Set permissions
chmod 755 logs uploads backups cache temp
chmod 755 public/{images,css,js,media}

# Create log files
touch logs/{application.log,error.log,access.log}
```

## Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/portfolio-site.git
cd portfolio-site

# Install dependencies
npm install
cd backend && npm install && cd ..

# Setup database
npm run db:setup
npm run db:migrate
npm run db:seed

# Start development servers
npm run dev
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run backend:dev\" \"npm run hugo:dev\"",
    "backend:dev": "cd backend && nodemon server.js",
    "hugo:dev": "hugo server -D --bind 0.0.0.0",
    "build": "npm run build:hugo && npm run build:assets",
    "build:hugo": "hugo --minify",
    "build:assets": "npm run css:build && npm run js:build",
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest --coverage",
    "test:integration": "jest --config=jest.integration.config.js"
  }
}
```

### Docker Development

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: portfolio_dev
      POSTGRES_USER: developer
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Run with Docker:
```bash
docker-compose -f docker-compose.dev.yml up
```

## Production Deployment

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security headers set
- [ ] Rate limiting enabled
- [ ] Error handling tested
- [ ] Performance optimized

### Manual Deployment

```bash
# 1. Connect to server
ssh user@your-server.com

# 2. Clone/update repository
git clone https://github.com/yourusername/portfolio-site.git
cd portfolio-site
git pull origin main

# 3. Install dependencies
npm ci --only=production
cd backend && npm ci --only=production && cd ..

# 4. Build assets
npm run build

# 5. Run database migrations
npm run db:migrate:production

# 6. Start application with PM2
pm2 start ecosystem.config.js --env production

# 7. Setup nginx
sudo cp nginx/portfolio.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/portfolio.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'portfolio-api',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/portfolio.conf
upstream portfolio_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name yoursite.com www.yoursite.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yoursite.com www.yoursite.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yoursite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yoursite.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Root directory
    root /var/www/portfolio/public;
    index index.html;

    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|webp|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api {
        proxy_pass http://portfolio_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://portfolio_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Hugo routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Automated Deployment (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/portfolio
            git pull origin main
            npm ci --only=production
            npm run build
            npm run db:migrate:production
            pm2 reload ecosystem.config.js --env production
```

## Cloud Platform Deployments

### AWS Deployment

#### EC2 Setup
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name portfolio-key \
  --security-groups portfolio-sg \
  --user-data file://startup-script.sh

# Connect to instance
ssh -i portfolio-key.pem ubuntu@ec2-instance-ip
```

#### Elastic Beanstalk
```bash
# Initialize EB
eb init -p node.js-20 portfolio-app

# Create environment
eb create production --instance-type t3.medium

# Deploy
eb deploy

# Open application
eb open
```

### Google Cloud Platform

```bash
# Initialize gcloud
gcloud init

# Create app.yaml
cat > app.yaml << EOF
runtime: nodejs20
instance_class: F2

env_variables:
  NODE_ENV: "production"

handlers:
- url: /api/.*
  script: auto
  secure: always

- url: /(.*\.(gif|png|jpg|css|js|ico|webp))$
  static_files: public/\1
  upload: public/.*\.(gif|png|jpg|css|js|ico|webp)$

- url: /.*
  script: auto
  secure: always
EOF

# Deploy
gcloud app deploy

# View logs
gcloud app logs tail -s default
```

### Netlify Deployment

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "public"
  functions = "netlify/functions"

[build.environment]
  HUGO_VERSION = "0.120.0"
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### Vercel Deployment

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

### Docker Production Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
RUN apk add --no-cache hugo
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
USER node
EXPOSE 3000
CMD ["node", "backend/server.js"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: portfolio:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Configuration Management

### Configuration Files Structure

```
config/
├── default.json       # Default configuration
├── development.json   # Development overrides
├── production.json    # Production overrides
├── test.json         # Test configuration
└── custom-environment-variables.json  # Environment variable mapping
```

### Using node-config

```javascript
// config/default.json
{
  "app": {
    "name": "Portfolio Site",
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "portfolio_db"
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  },
  "security": {
    "saltRounds": 10,
    "jwtExpiry": "15m"
  }
}

// config/custom-environment-variables.json
{
  "app": {
    "port": "PORT",
    "host": "HOST"
  },
  "database": {
    "host": "DB_HOST",
    "port": "DB_PORT",
    "name": "DB_NAME",
    "user": "DB_USER",
    "password": "DB_PASSWORD"
  }
}

// Usage in application
const config = require('config');
const dbConfig = config.get('database');
```

### Secrets Management

#### Using HashiCorp Vault
```bash
# Install Vault
wget https://releases.hashicorp.com/vault/1.13.0/vault_1.13.0_linux_amd64.zip
unzip vault_1.13.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Start Vault server
vault server -dev

# Store secrets
vault kv put secret/portfolio \
  db_password="secure_password" \
  jwt_secret="jwt_secret_key" \
  api_key="external_api_key"

# Retrieve secrets in application
const vault = require('node-vault')();
const secrets = await vault.read('secret/portfolio');
```

#### Using AWS Secrets Manager
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  try {
    const data = await secretsManager.getSecretValue({
      SecretId: secretName
    }).promise();
    
    return JSON.parse(data.SecretString);
  } catch (error) {
    console.error('Failed to retrieve secret:', error);
    throw error;
  }
}

// Usage
const dbConfig = await getSecret('portfolio/database');
```

## SSL/TLS Setup

### Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yoursite.com -d www.yoursite.com

# Auto-renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
0 0,12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate CSR
openssl req -new -key private.key -out certificate.csr

# Self-signed certificate (for testing)
openssl x509 -req -days 365 -in certificate.csr \
  -signkey private.key -out certificate.crt

# Configure in application
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('certificate.crt')
};

https.createServer(options, app).listen(443);
```

## Database Configuration

### PostgreSQL Setup

```sql
-- Create database and user
CREATE DATABASE portfolio_prod;
CREATE USER portfolio_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE portfolio_prod TO portfolio_user;

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Reload configuration
SELECT pg_reload_conf();
```

### Database Migrations

```javascript
// migrations/001_initial_schema.js
exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.timestamps(true, true);
    })
    .createTable('content', table => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('content');
      table.integer('author_id').references('id').inTable('users');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('content')
    .dropTableIfExists('users');
};
```

### Connection Pooling

```javascript
// database.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

## Monitoring Setup

### Application Monitoring

```javascript
// monitoring.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### Health Checks

```javascript
// health.js
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {}
  };

  // Database check
  try {
    await db.query('SELECT 1');
    health.checks.database = 'OK';
  } catch (error) {
    health.checks.database = 'ERROR';
    health.message = 'DEGRADED';
  }

  // Redis check
  try {
    await redis.ping();
    health.checks.redis = 'OK';
  } catch (error) {
    health.checks.redis = 'ERROR';
    health.message = 'DEGRADED';
  }

  const status = health.message === 'OK' ? 200 : 503;
  res.status(status).json(health);
});
```

## Backup Configuration

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

# Configuration
BACKUP_DIR="/var/backups/portfolio"
DB_NAME="portfolio_prod"
DB_USER="portfolio_user"
S3_BUCKET="portfolio-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Media files backup
tar -czf $BACKUP_DIR/media_$TIMESTAMP.tar.gz /var/www/portfolio/uploads

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$TIMESTAMP.sql.gz s3://$S3_BUCKET/database/
aws s3 cp $BACKUP_DIR/media_$TIMESTAMP.tar.gz s3://$S3_BUCKET/media/

# Clean old local backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

# Clean old S3 backups
aws s3 ls s3://$S3_BUCKET/ --recursive | while read -r line; do
  createDate=$(echo $line | awk '{print $1" "$2}')
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk '{print $4}')
    aws s3 rm s3://$S3_BUCKET/$fileName
  fi
done
```

### Backup Cron Jobs

```bash
# Edit crontab
crontab -e

# Daily database backup at 2 AM
0 2 * * * /usr/local/bin/backup.sh

# Weekly full backup on Sunday at 3 AM
0 3 * * 0 /usr/local/bin/full-backup.sh

# Monthly archive on 1st at 4 AM
0 4 1 * * /usr/local/bin/archive-backup.sh
```

### Disaster Recovery Plan

```yaml
Recovery Procedures:
  1. Database Recovery:
    - Download latest backup from S3
    - Restore using pg_restore
    - Verify data integrity
    
  2. Application Recovery:
    - Pull latest code from repository
    - Restore environment configuration
    - Install dependencies
    - Run migrations
    
  3. Media Recovery:
    - Download media backup from S3
    - Extract to uploads directory
    - Verify file permissions
    
  4. DNS Failover:
    - Update DNS records to backup server
    - Verify SSL certificates
    - Test application endpoints
```

## Post-Deployment Tasks

### Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 100 https://yoursite.com/

# Load testing with k6
k6 run load-test.js

# Performance monitoring
lighthouse https://yoursite.com --output html --output-path ./lighthouse-report.html
```

### Security Scanning

```bash
# Security headers check
npm install -g securityheaders
securityheaders https://yoursite.com

# Vulnerability scanning
npm audit
npm audit fix

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://yoursite.com
```

### Final Checklist

- [ ] Application running without errors
- [ ] All endpoints responding correctly
- [ ] SSL certificate valid and installed
- [ ] Database connections stable
- [ ] Monitoring dashboards active
- [ ] Backup systems verified
- [ ] Security scans passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Team notified of deployment

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs
journalctl -u portfolio

# Check port availability
sudo netstat -tlnp | grep 3000

# Check permissions
ls -la /var/www/portfolio

# Check environment variables
printenv | grep NODE
```

#### Database Connection Issues
```bash
# Test connection
psql -h localhost -U portfolio_user -d portfolio_prod

# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart application
pm2 restart portfolio-api

# Clear cache
redis-cli FLUSHALL
```

## Support and Resources

- Documentation: https://docs.yoursite.com
- Status Page: https://status.yoursite.com
- Support Email: support@yoursite.com
- Community Forum: https://forum.yoursite.com
- GitHub Issues: https://github.com/yourusername/portfolio-site/issues