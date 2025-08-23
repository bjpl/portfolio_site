# Deployment Guide

Complete deployment configuration and production setup for the Brandon JP Lambert Portfolio Site.

## 🚀 Deployment Overview

### Deployment Architecture
```
GitHub Repository → Build Pipeline → Production Environment → CDN
       ↓                 ↓                  ↓              ↓
   Code Changes    Automated Tests    Live Application   Global Delivery
```

### Supported Platforms
- **Netlify** (Primary) - Static site + Serverless functions
- **Vercel** - Alternative static hosting
- **Railway** - Full-stack deployment
- **Docker** - Container deployment
- **Kubernetes** - Enterprise scaling

## 🎯 Netlify Deployment (Recommended)

### Automatic Deployment Setup

1. **Connect Repository**
   ```bash
   # Fork/clone repository to your GitHub account
   # Connect repository to Netlify dashboard
   ```

2. **Build Configuration** (netlify.toml)
   ```toml
   [build]
     publish = "public"
     command = "npm run build:netlify"
     functions = "netlify/functions"
   
   [build.environment]
     NODE_VERSION = "18"
     HUGO_VERSION = "0.121.0"
     NPM_FLAGS = "--production=false"
   
   [[redirects]]
     from = "/admin/*"
     to = "/admin/index.html"
     status = 200
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 404
   
   [functions]
     node_bundler = "esbuild"
     included_files = ["netlify/functions/**"]
   
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-XSS-Protection = "1; mode=block"
       X-Content-Type-Options = "nosniff"
       Referrer-Policy = "strict-origin-when-cross-origin"
       Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co"
   ```

3. **Environment Variables**
   ```bash
   # In Netlify Dashboard > Site Settings > Environment Variables
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   NODE_ENV=production
   HUGO_ENV=production
   ```

4. **Deploy Commands**
   ```bash
   # Manual deploy
   npm run deploy
   
   # Deploy with specific environment
   npm run deploy:production
   
   # Deploy preview
   npm run deploy:preview
   ```

### Netlify Functions Setup

**Function Structure:**
```
netlify/functions/
├── auth.js              # Authentication endpoints
├── blog.js              # Blog API
├── contact.js           # Contact form handler
├── health.js            # Health checks
├── projects.js          # Project API
└── utils/               # Shared utilities
    ├── auth-utils.js
    ├── supabase.js
    └── cors.js
```

**Example Function:**
```javascript
// netlify/functions/projects.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### Custom Domain Setup

1. **Add Custom Domain**
   ```bash
   # In Netlify Dashboard
   # Domain Settings > Add Custom Domain
   # Example: brandonjplambert.com
   ```

2. **DNS Configuration**
   ```dns
   # A Record
   @ → 75.2.60.5
   
   # CNAME Record
   www → vocal-pony-24e3de.netlify.app
   
   # MX Records (if using email)
   @ → mail.example.com (priority 10)
   ```

3. **SSL Certificate**
   ```bash
   # Automatic SSL via Let's Encrypt
   # Enabled by default in Netlify
   # Verify at: https://your-domain.com
   ```

## ⚡ Vercel Deployment

### Vercel Configuration (vercel.json)
```json
{
  "version": 2,
  "build": {
    "env": {
      "HUGO_VERSION": "0.121.0"
    }
  },
  "builds": [
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
      "src": "/admin/(.*)",
      "dest": "/admin/index.html"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "functions": {
    "netlify/functions/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### Deployment Commands
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🚂 Railway Deployment

### Railway Configuration (railway.toml)
```toml
[build]
  builder = "nixpacks"
  buildCommand = "npm run build"

[deploy]
  startCommand = "npm run start:production"
  healthcheckPath = "/api/health"
  healthcheckTimeout = 30
  restartPolicyType = "on_failure"
  restartPolicyMaxRetries = 3

[[services]]
  name = "web"
  source = "."

[[services]]
  name = "postgres"
  source = "postgres:14"
```

### Environment Setup
```bash
# Railway environment variables
railway variables set SUPABASE_URL=your-url
railway variables set SUPABASE_ANON_KEY=your-key
railway variables set NODE_ENV=production
```

## 🐳 Docker Deployment

### Production Dockerfile
```dockerfile
# Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Install Hugo
RUN apk add --no-cache wget && \
    wget -O hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v0.121.0/hugo_extended_0.121.0_linux-amd64.tar.gz && \
    tar -xzf hugo.tar.gz && \
    mv hugo /usr/local/bin/ && \
    rm hugo.tar.gz

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/public /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    volumes:
      - ./ssl:/etc/ssl/certs
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    restart: unless-stopped

  backend:
    build:
      context: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - "3000:3000"
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Deploy with Docker
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## ☸️ Kubernetes Deployment

### Kubernetes Manifests
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: portfolio-web
  template:
    metadata:
      labels:
        app: portfolio-web
    spec:
      containers:
      - name: web
        image: your-registry/portfolio:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: portfolio-secrets
              key: supabase-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: portfolio-web-service
spec:
  selector:
    app: portfolio-web
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

### Kubernetes Deployment
```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/portfolio-web

# Scale deployment
kubectl scale deployment portfolio-web --replicas=5
```

## 📊 Monitoring & Observability

### Application Monitoring
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'portfolio-web'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'portfolio-functions'
    static_configs:
      - targets: ['localhost:8888']
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Portfolio Site Metrics",
    "panels": [
      {
        "title": "Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Error Rates",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status!~\"2..\"}[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

### Health Checks
```javascript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'OK'
  };

  // Check database connection
  try {
    await supabase.from('health_check').select('1').limit(1);
    checks.database = 'OK';
  } catch (error) {
    checks.database = 'ERROR';
    checks.status = 'ERROR';
  }

  // Check external services
  try {
    await fetch('https://api.cloudinary.com/v1_1/health');
    checks.cloudinary = 'OK';
  } catch (error) {
    checks.cloudinary = 'ERROR';
  }

  const statusCode = checks.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

## 🔒 Production Security

### Security Headers
```javascript
// Security middleware
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
```

### Environment Security
```bash
# Secure environment variables
# Never commit sensitive data
# Use secrets management

# Netlify
netlify env:set SECRET_KEY "your-secret-value"

# Railway
railway variables set SECRET_KEY=your-secret-value

# Kubernetes
kubectl create secret generic portfolio-secrets \
  --from-literal=supabase-url=your-url \
  --from-literal=supabase-key=your-key
```

## 🚀 Performance Optimization

### Build Optimization
```bash
# Optimize images
npm run optimize:images

# Minify assets
npm run minify

# Generate service worker
npm run sw:generate

# Critical CSS
npm run critical
```

### CDN Configuration
```javascript
// Static asset caching
const cacheOptions = {
  'Cache-Control': 'public, max-age=31536000, immutable'
};

// API response caching
const apiCacheOptions = {
  'Cache-Control': 'public, max-age=300, s-maxage=600'
};
```

## 🔧 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint
    
    - name: Security audit
      run: npm audit --audit-level=high

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Hugo
      uses: peaceiris/actions-hugo@v2
      with:
        hugo-version: '0.121.0'
        extended: true
    
    - name: Build site
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: public
        path: public/

  deploy:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: public
        path: public/
    
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2.0
      with:
        publish-dir: './public'
        production-branch: main
        github-token: ${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 🔍 Deployment Verification

### Deployment Checklist
- [ ] All environment variables configured
- [ ] SSL certificate installed and valid
- [ ] Database migrations completed
- [ ] Static assets optimized and cached
- [ ] Health checks passing
- [ ] Monitoring and logging configured
- [ ] Backup system operational
- [ ] Domain and DNS configured
- [ ] Security headers implemented
- [ ] Performance benchmarks met

### Post-Deployment Testing
```bash
# Health check
curl https://your-domain.com/api/health

# Performance test
npm run test:performance https://your-domain.com

# Security scan
npm run security:scan https://your-domain.com

# Accessibility audit
npm run audit:a11y https://your-domain.com
```

### Rollback Procedures
```bash
# Netlify rollback
netlify sites:list
netlify api listSiteDeploys --data '{ "site_id": "SITE_ID" }'
netlify api restoreSiteDeploy --data '{ "site_id": "SITE_ID", "deploy_id": "DEPLOY_ID" }'

# Docker rollback
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --scale backend=0
docker tag portfolio:previous portfolio:latest
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support & Maintenance

### Maintenance Windows
- **Regular Updates**: 2nd Tuesday of each month
- **Security Patches**: As needed (emergency)
- **Major Upgrades**: Quarterly

### Monitoring Alerts
```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://localhost:5001/'
```

---

*This deployment guide covers production-ready configurations. For development setup, see [SETUP.md](./SETUP.md).*