# System Architecture Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Technology Stack](#technology-stack)
4. [Data Architecture](#data-architecture)
5. [API Architecture](#api-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Performance Architecture](#performance-architecture)
9. [Monitoring and Observability](#monitoring-and-observability)
10. [Disaster Recovery](#disaster-recovery)

## Architecture Overview

### System Design Principles

The portfolio site follows these architectural principles:

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data layers
2. **Microservices-Ready**: Modular design allowing easy transition to microservices
3. **API-First**: All functionality exposed through RESTful APIs
4. **Cloud-Native**: Designed for containerization and cloud deployment
5. **Security by Design**: Security considerations at every layer
6. **Scalability**: Horizontal scaling capabilities built-in
7. **High Availability**: Redundancy and failover mechanisms

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CDN Layer                           │
│                    (CloudFlare/Fastly)                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
│                   (Nginx/HAProxy/ALB)                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────────────┐                          ┌───────────────┐
│  Web Server   │                          │  Web Server   │
│   (Nginx)     │                          │   (Nginx)     │
└───────────────┘                          └───────────────┘
        │                                           │
┌───────────────┐                          ┌───────────────┐
│  Application  │                          │  Application  │
│    Server     │                          │    Server     │
│  (Node.js)    │                          │  (Node.js)    │
└───────────────┘                          └───────────────┘
        │                                           │
        └─────────────────────┬─────────────────────┘
                              │
                    ┌─────────────────┐
                    │   Message Queue  │
                    │  (Redis/RabbitMQ)│
                    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │     Redis     │    │ Elasticsearch │
│   (Primary)   │    │    (Cache)    │    │   (Search)    │
└───────────────┘    └───────────────┘    └───────────────┘
        │
┌───────────────┐
│  PostgreSQL   │
│   (Replica)   │
└───────────────┘
```

## System Components

### Frontend Components

#### Static Site Generator (Hugo)
- **Purpose**: Generate static HTML pages
- **Features**:
  - Markdown content processing
  - Template rendering
  - Asset optimization
  - Multi-language support
  - Taxonomy generation

#### Client-Side Application
- **Technologies**: Vanilla JavaScript, Web Components
- **Features**:
  - Progressive enhancement
  - Lazy loading
  - Service worker for offline support
  - Real-time updates via WebSocket
  - Client-side routing for SPAs

#### Admin Dashboard
- **Framework**: React (for complex interactions)
- **Features**:
  - Content management interface
  - Media library
  - Analytics dashboard
  - User management
  - Real-time notifications

### Backend Components

#### API Server (Node.js/Express)
- **Responsibilities**:
  - Request handling and routing
  - Business logic execution
  - Authentication and authorization
  - Data validation and sanitization
  - Response formatting

#### Content Management Service
- **Features**:
  - CRUD operations for content
  - Version control
  - Workflow management
  - Content scheduling
  - Multi-language support

#### Media Service
- **Capabilities**:
  - Image upload and processing
  - Video transcoding
  - CDN integration
  - Thumbnail generation
  - Metadata extraction

#### Authentication Service
- **Implementation**:
  - JWT token generation
  - OAuth2 integration
  - Session management
  - Password hashing (bcrypt)
  - Two-factor authentication

#### WebSocket Server
- **Use Cases**:
  - Real-time notifications
  - Live content updates
  - Collaborative editing
  - System status updates
  - Chat functionality

### Data Layer Components

#### PostgreSQL Database
- **Primary Database**:
  - Relational data storage
  - ACID compliance
  - Complex queries
  - Full-text search
  - JSON support for flexible schemas

#### Redis Cache
- **Caching Strategy**:
  - Session storage
  - API response caching
  - Rate limiting counters
  - Real-time data
  - Pub/sub messaging

#### Elasticsearch
- **Search Capabilities**:
  - Full-text search
  - Faceted search
  - Autocomplete
  - Search analytics
  - Log aggregation

## Technology Stack

### Frontend Technologies
```yaml
Static Site:
  - Generator: Hugo v0.120+
  - Templates: Go HTML templates
  - Styling: SCSS/PostCSS
  - JavaScript: ES6+ modules
  - Build Tools: Vite, Webpack

Admin Panel:
  - Framework: React 18+
  - State Management: Context API
  - UI Components: Custom design system
  - Forms: React Hook Form
  - Charts: Chart.js

Performance:
  - Image Optimization: Sharp, ImageMin
  - CSS: PurgeCSS, Critical CSS
  - JavaScript: Tree shaking, Code splitting
  - Caching: Service Workers
```

### Backend Technologies
```yaml
Application:
  - Runtime: Node.js 20 LTS
  - Framework: Express 5.x
  - Authentication: Passport.js
  - Validation: Joi/Yup
  - ORM: Sequelize/Prisma

Services:
  - Queue: Bull (Redis-based)
  - WebSocket: Socket.io
  - Email: Nodemailer
  - Storage: AWS S3/MinIO
  - Search: Elasticsearch client

Development:
  - Testing: Jest, Supertest
  - Linting: ESLint
  - Formatting: Prettier
  - Documentation: Swagger/OpenAPI
```

### Infrastructure Technologies
```yaml
Containerization:
  - Docker: Multi-stage builds
  - Orchestration: Kubernetes/Docker Swarm
  - Registry: Docker Hub/ECR

Cloud Services:
  - Hosting: AWS/GCP/Azure
  - CDN: CloudFlare/Fastly
  - Storage: S3/Cloud Storage
  - Database: RDS/Cloud SQL

Monitoring:
  - Metrics: Prometheus
  - Visualization: Grafana
  - Logging: ELK Stack
  - Tracing: Jaeger
  - Alerts: AlertManager
```

## Data Architecture

### Database Schema

#### Core Tables
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Content table (polymorphic)
CREATE TABLE content (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'blog', 'portfolio', 'page'
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    metadata JSONB,
    author_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content versions
CREATE TABLE content_versions (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content(id),
    version_number INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT,
    metadata JSONB,
    changed_by INTEGER REFERENCES users(id),
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media files
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    size INTEGER,
    url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    metadata JSONB,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow states
CREATE TABLE workflow_states (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content(id),
    state VARCHAR(50) NOT NULL,
    assigned_to INTEGER REFERENCES users(id),
    comments TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Data Models

#### Content Model
```javascript
{
  id: Number,
  type: String, // 'blog', 'portfolio', 'page'
  title: String,
  slug: String,
  content: String, // Markdown or HTML
  excerpt: String,
  metadata: {
    seo: {
      title: String,
      description: String,
      keywords: Array,
      ogImage: String
    },
    custom: Object // Flexible custom fields
  },
  author: User,
  status: String, // 'draft', 'published', 'archived'
  publishedAt: Date,
  categories: Array,
  tags: Array,
  featuredImage: Media,
  gallery: [Media],
  versions: [ContentVersion],
  translations: {
    es: ContentTranslation,
    fr: ContentTranslation
  },
  analytics: {
    views: Number,
    uniqueVisitors: Number,
    avgTimeOnPage: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Caching Strategy

#### Cache Layers
1. **Browser Cache**:
   - Static assets: 1 year
   - API responses: 5 minutes
   - HTML pages: 1 hour

2. **CDN Cache**:
   - Images: 30 days
   - CSS/JS: 7 days
   - HTML: 1 hour

3. **Application Cache (Redis)**:
   - Session data: 24 hours
   - API responses: 5-60 minutes
   - Database queries: 1-5 minutes

4. **Database Cache**:
   - Query result cache
   - Prepared statements
   - Connection pooling

## API Architecture

### RESTful Design

#### Resource Naming
```
GET    /api/v1/content          # List all content
GET    /api/v1/content/:id      # Get specific content
POST   /api/v1/content          # Create content
PUT    /api/v1/content/:id      # Update content
DELETE /api/v1/content/:id      # Delete content

GET    /api/v1/content/:id/versions     # Get versions
POST   /api/v1/content/:id/publish      # Publish content
POST   /api/v1/content/:id/restore/:version # Restore version
```

### API Gateway Pattern

```javascript
// API Gateway responsibilities
class APIGateway {
  // Request routing
  route(request) {
    return this.router.match(request.path);
  }

  // Authentication
  async authenticate(request) {
    return this.authService.verify(request.headers.authorization);
  }

  // Rate limiting
  async checkRateLimit(request) {
    return this.rateLimiter.check(request.ip);
  }

  // Request transformation
  transformRequest(request) {
    return this.transformer.transform(request);
  }

  // Response aggregation
  async aggregate(requests) {
    const responses = await Promise.all(requests);
    return this.aggregator.combine(responses);
  }

  // Caching
  async cache(key, data, ttl) {
    return this.cacheService.set(key, data, ttl);
  }
}
```

### GraphQL Layer (Optional)

```graphql
type Query {
  content(id: ID!): Content
  contents(filter: ContentFilter, pagination: Pagination): ContentConnection
  user(id: ID!): User
  media(id: ID!): Media
}

type Mutation {
  createContent(input: ContentInput!): Content
  updateContent(id: ID!, input: ContentInput!): Content
  deleteContent(id: ID!): Boolean
  publishContent(id: ID!): Content
}

type Subscription {
  contentUpdated(id: ID!): Content
  newComment(contentId: ID!): Comment
}
```

## Security Architecture

### Security Layers

#### Application Security
1. **Authentication**:
   - JWT tokens with refresh tokens
   - OAuth2 for social login
   - Two-factor authentication
   - Session management

2. **Authorization**:
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API key management
   - IP whitelisting

3. **Data Protection**:
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.3)
   - Database field encryption
   - Secure key management (KMS)

#### Network Security
```yaml
Firewall Rules:
  - Allow HTTPS (443) from anywhere
  - Allow SSH (22) from specific IPs
  - Deny all other inbound traffic
  - Allow all outbound traffic

DDoS Protection:
  - Rate limiting per IP
  - CloudFlare protection
  - Fail2ban for brute force
  - CAPTCHA for suspicious activity

SSL/TLS:
  - Force HTTPS redirect
  - HSTS headers
  - Certificate pinning
  - Perfect forward secrecy
```

### Security Headers
```javascript
// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  next();
});
```

## Deployment Architecture

### Container Architecture

#### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio-api
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
        image: portfolio-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: docker build -t portfolio-api .
      - run: docker push registry/portfolio-api

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: kubectl apply -f k8s/
      - run: kubectl rollout status deployment/portfolio-api
```

## Performance Architecture

### Performance Optimization Strategies

#### Frontend Performance
1. **Asset Optimization**:
   - Image lazy loading
   - WebP format with fallbacks
   - Critical CSS inlining
   - JavaScript code splitting
   - Tree shaking unused code

2. **Caching Strategy**:
   - Service worker caching
   - Browser cache headers
   - CDN edge caching
   - API response caching

3. **Rendering Optimization**:
   - Static site generation
   - Incremental static regeneration
   - Virtual scrolling for lists
   - Debounced search
   - Optimistic UI updates

#### Backend Performance
1. **Database Optimization**:
   - Query optimization
   - Index strategy
   - Connection pooling
   - Read replicas
   - Query caching

2. **Application Optimization**:
   - Async/await patterns
   - Stream processing
   - Worker threads
   - Memory management
   - Request batching

### Performance Metrics

```javascript
// Performance monitoring
class PerformanceMonitor {
  metrics = {
    responseTime: [],
    throughput: 0,
    errorRate: 0,
    cpuUsage: 0,
    memoryUsage: 0
  };

  recordMetric(name, value) {
    this.metrics[name].push({
      value,
      timestamp: Date.now()
    });
  }

  getAverageResponseTime() {
    const times = this.metrics.responseTime;
    return times.reduce((a, b) => a + b.value, 0) / times.length;
  }

  alert(metric, threshold) {
    if (this.metrics[metric] > threshold) {
      this.notificationService.send({
        level: 'warning',
        message: `${metric} exceeded threshold: ${this.metrics[metric]}`
      });
    }
  }
}
```

## Monitoring and Observability

### Monitoring Stack

#### Metrics Collection (Prometheus)
```yaml
# Prometheus configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'portfolio-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']
```

#### Logging (ELK Stack)
```javascript
// Structured logging
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Log with context
logger.info('User action', {
  userId: user.id,
  action: 'content_created',
  contentId: content.id,
  timestamp: new Date().toISOString()
});
```

#### Distributed Tracing (Jaeger)
```javascript
// Tracing setup
const { initTracer } = require('jaeger-client');

const config = {
  serviceName: 'portfolio-api',
  sampler: {
    type: 'const',
    param: 1
  },
  reporter: {
    logSpans: true,
    agentHost: 'jaeger',
    agentPort: 6832
  }
};

const tracer = initTracer(config);
```

### Alerting Rules

```yaml
# AlertManager rules
groups:
  - name: api_alerts
    rules:
      - alert: HighResponseTime
        expr: http_request_duration_seconds > 1
        for: 5m
        annotations:
          summary: "High response time detected"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Database is down"
```

## Disaster Recovery

### Backup Strategy

#### Backup Schedule
```yaml
Database Backups:
  - Full backup: Daily at 2 AM
  - Incremental: Every 6 hours
  - Transaction logs: Continuous
  - Retention: 30 days

Media Backups:
  - Full sync: Weekly
  - Incremental: Daily
  - Retention: 90 days

Application Backups:
  - Configuration: On change
  - Secrets: Encrypted, daily
  - Code: Git repository
```

### Recovery Procedures

#### RTO and RPO Targets
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour

#### Disaster Recovery Plan
1. **Detection**: Automated monitoring alerts
2. **Assessment**: Determine failure scope
3. **Communication**: Notify stakeholders
4. **Failover**: Switch to backup systems
5. **Recovery**: Restore from backups
6. **Validation**: Verify system integrity
7. **Documentation**: Record incident details

### High Availability Setup

```yaml
Multi-Region Deployment:
  Primary Region: us-east-1
    - Application servers: 3
    - Database: Primary
    - Cache: Primary

  Secondary Region: us-west-2
    - Application servers: 2
    - Database: Read replica
    - Cache: Replica

  Failover:
    - DNS failover: Route53
    - Database promotion: Automatic
    - Cache sync: Redis Sentinel
```

## Scalability Considerations

### Horizontal Scaling

#### Auto-scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: portfolio-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: portfolio-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Scaling

#### Read Replica Configuration
```sql
-- Primary database configuration
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

-- Read replica configuration
hot_standby = on
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s
```

## Development Workflow

### Environment Setup

#### Local Development
```bash
# Clone repository
git clone https://github.com/portfolio/site.git

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Code Quality Standards

#### Linting Rules
```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

#### Testing Requirements
- Unit test coverage: >80%
- Integration test coverage: >60%
- E2E test coverage: Critical paths
- Performance tests: Load testing

## Conclusion

This architecture provides a robust, scalable, and maintainable foundation for the portfolio site. The modular design allows for easy updates and extensions while maintaining system stability and performance. Regular review and updates of this architecture document ensure alignment with evolving requirements and best practices.