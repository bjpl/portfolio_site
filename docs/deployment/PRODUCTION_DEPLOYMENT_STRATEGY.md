# Production Deployment Strategy

## Overview

This document outlines the comprehensive deployment strategy for migrating the portfolio site from Hugo/Netlify to Next.js 14/Vercel, including infrastructure, CI/CD pipelines, environment management, and operational procedures.

## Current vs. Target Deployment Architecture

### Current Deployment (Hugo + Netlify)
```
Current Deployment Architecture
┌─────────────────────────────────┐
│         Source Control           │
│ ├── GitHub Repository           │
│ ├── Hugo Static Files           │
│ ├── Content in Markdown         │
│ └── Build Scripts               │
├─────────────────────────────────┤
│         Build Process           │
│ ├── Hugo Static Generation      │
│ ├── Asset Optimization          │
│ ├── Multilingual Build          │
│ └── Function Compilation        │
├─────────────────────────────────┤
│       Netlify Infrastructure    │
│ ├── Global CDN                  │
│ ├── Edge Functions              │
│ ├── Form Handling               │
│ └── Branch Deployments          │
└─────────────────────────────────┘
```

### Target Deployment (Next.js + Vercel)
```
Target Deployment Architecture
┌─────────────────────────────────┐
│         Source Control          │
│ ├── GitHub Repository          │
│ ├── Next.js Application        │
│ ├── Database Migrations        │
│ └── Environment Configs        │
├─────────────────────────────────┤
│         Build Process           │
│ ├── Next.js Build              │
│ ├── TypeScript Compilation     │
│ ├── Static Optimization        │
│ └── Edge Function Build        │
├─────────────────────────────────┤
│       Vercel Infrastructure     │
│ ├── Global Edge Network        │
│ ├── Serverless Functions       │
│ ├── Static Asset CDN           │
│ └── Preview Deployments        │
├─────────────────────────────────┤
│        External Services        │
│ ├── Supabase (Database/Auth)   │
│ ├── Auth0 (Authentication)     │
│ ├── Cloudinary (Media)         │
│ └── Analytics Platforms        │
└─────────────────────────────────┘
```

## Deployment Strategy

### Phase 1: Infrastructure Setup

#### 1.1 Vercel Project Configuration
```javascript
// vercel.json
{
  "version": 2,
  "name": "portfolio-nextjs",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "@vercel/node",
      "maxDuration": 30
    }
  },
  
  "regions": ["iad1", "sfo1", "lhr1"],
  
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "AUTH0_SECRET": "@auth0-secret",
    "AUTH0_BASE_URL": "@auth0-base-url",
    "AUTH0_ISSUER_BASE_URL": "@auth0-issuer-url",
    "AUTH0_CLIENT_ID": "@auth0-client-id",
    "AUTH0_CLIENT_SECRET": "@auth0-client-secret"
  },
  
  "build": {
    "env": {
      "NODE_ENV": "production",
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
}
```

#### 1.2 Environment Configuration
```bash
# Production Environment Variables (.env.production)

# Next.js Configuration
NEXT_PUBLIC_APP_URL=https://portfolio.yourdomain.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth0 Configuration
AUTH0_SECRET=your-32-character-secret
AUTH0_BASE_URL=https://portfolio.yourdomain.com
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Analytics & Monitoring
VERCEL_ANALYTICS_ID=your-analytics-id
SENTRY_DSN=your-sentry-dsn
GOOGLE_ANALYTICS_ID=your-ga-id

# Feature Flags
ENABLE_REAL_TIME=true
ENABLE_ANALYTICS=true
ENABLE_ERROR_REPORTING=true
```

### Phase 2: CI/CD Pipeline Setup

#### 2.1 GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Type checking
        run: npm run typecheck
        
      - name: Linting
        run: npm run lint
        
      - name: Unit tests
        run: npm run test:unit
        
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  deploy-preview:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy to production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Run post-deployment tests
        run: npm run test:e2e:production
        env:
          TEST_BASE_URL: https://portfolio.yourdomain.com
```

#### 2.2 Quality Gates
```yaml
# Quality gate configuration
quality-gates:
  code-coverage:
    minimum: 80%
    
  lighthouse-scores:
    performance: 90
    accessibility: 95
    best-practices: 90
    seo: 95
    
  bundle-size:
    maximum: "500kb"
    
  build-time:
    maximum: "5 minutes"
```

### Phase 3: Environment Management

#### 3.1 Multi-Environment Setup
```
Environment Strategy
┌─────────────────────────────────┐
│         Development             │
│ ├── Local development          │
│ ├── Hot reloading               │
│ ├── Development database       │
│ └── Mock external services     │
├─────────────────────────────────┤
│           Staging               │
│ ├── Preview deployments        │
│ ├── Feature branch testing     │
│ ├── Staging database           │
│ └── Integration testing        │
├─────────────────────────────────┤
│         Production              │
│ ├── Production deployment      │
│ ├── Production database        │
│ ├── Full monitoring            │
│ └── Performance optimization   │
└─────────────────────────────────┘
```

#### 3.2 Environment-Specific Configurations
```typescript
// lib/config.ts
const config = {
  development: {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    auth0: {
      domain: 'dev-tenant.auth0.com',
      clientId: process.env.AUTH0_CLIENT_ID!,
    },
    features: {
      enableAnalytics: false,
      enableErrorReporting: false,
      enableRealTime: true,
    }
  },
  
  staging: {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    auth0: {
      domain: 'staging-tenant.auth0.com', 
      clientId: process.env.AUTH0_CLIENT_ID!,
    },
    features: {
      enableAnalytics: true,
      enableErrorReporting: true,
      enableRealTime: true,
    }
  },
  
  production: {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    auth0: {
      domain: 'production-tenant.auth0.com',
      clientId: process.env.AUTH0_CLIENT_ID!,
    },
    features: {
      enableAnalytics: true,
      enableErrorReporting: true,
      enableRealTime: true,
    }
  }
};

export default config[process.env.NODE_ENV as keyof typeof config] || config.development;
```

### Phase 4: Database Migration Strategy

#### 4.1 Supabase Migration Pipeline
```sql
-- Migration script template
-- migrations/YYYYMMDD_HHMMSS_migration_name.sql

BEGIN;

-- Create new tables or modify existing ones
-- Include rollback instructions as comments

-- Example migration
ALTER TABLE blog_posts 
ADD COLUMN featured_image_url VARCHAR(255),
ADD COLUMN featured_image_alt TEXT;

-- Rollback: 
-- ALTER TABLE blog_posts 
-- DROP COLUMN featured_image_url,
-- DROP COLUMN featured_image_alt;

COMMIT;
```

#### 4.2 Content Migration Process
```typescript
// scripts/migrate-content.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { parse } from 'gray-matter';

async function migrateHugoContent() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const contentDir = './content';
  const files = readdirSync(contentDir, { recursive: true });
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const content = readFileSync(`${contentDir}/${file}`, 'utf8');
    const { data: frontmatter, content: body } = parse(content);
    
    // Transform Hugo content to database format
    const post = {
      title: frontmatter.title,
      slug: frontmatter.slug || generateSlug(frontmatter.title),
      content: body,
      published_at: frontmatter.date,
      status: frontmatter.draft ? 'draft' : 'published',
      metadata: {
        tags: frontmatter.tags || [],
        categories: frontmatter.categories || [],
        featured_image: frontmatter.featured_image,
        seo: {
          title: frontmatter.seo_title,
          description: frontmatter.description,
        }
      }
    };
    
    const { error } = await supabase
      .from('blog_posts')
      .insert(post);
      
    if (error) {
      console.error(`Failed to migrate ${file}:`, error);
    } else {
      console.log(`Migrated ${file} successfully`);
    }
  }
}
```

### Phase 5: Monitoring & Observability

#### 5.1 Application Monitoring
```typescript
// lib/monitoring.ts
import { init } from '@sentry/nextjs';

// Error tracking
init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  }
});

// Performance monitoring
export const trackPageLoad = (pageName: string, duration: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_load_time', {
      custom_parameter: pageName,
      value: Math.round(duration),
    });
  }
};

// Real-time monitoring
export const monitorApiEndpoint = async (
  endpoint: string,
  handler: () => Promise<any>
) => {
  const start = Date.now();
  
  try {
    const result = await handler();
    const duration = Date.now() - start;
    
    // Log successful API calls
    console.log(`[API] ${endpoint}: ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    // Log and report API errors
    console.error(`[API ERROR] ${endpoint}: ${duration}ms`, error);
    
    throw error;
  }
};
```

#### 5.2 Health Check System
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    status: 'healthy',
    checks: {
      database: false,
      auth: false,
      storage: false,
    }
  };
  
  // Database health check
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error } = await supabase
      .from('health_check')
      .select('id')
      .limit(1);
      
    checks.checks.database = !error;
  } catch {
    checks.checks.database = false;
  }
  
  // Auth0 health check
  try {
    const response = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/openid_configuration`);
    checks.checks.auth = response.ok;
  } catch {
    checks.checks.auth = false;
  }
  
  // Storage health check
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data } = await supabase.storage.listBuckets();
    checks.checks.storage = Array.isArray(data);
  } catch {
    checks.checks.storage = false;
  }
  
  // Overall health status
  const allHealthy = Object.values(checks.checks).every(check => check);
  checks.status = allHealthy ? 'healthy' : 'degraded';
  
  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503
  });
}
```

### Phase 6: Performance Optimization

#### 6.1 Build Optimization
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@prisma/client'],
    optimizeCss: true,
  },
  
  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          fs: false,
        };
      }
      return config;
    },
  }),
  
  // Image optimization
  images: {
    domains: [
      'tdmzayzkqyegvfgxlolj.supabase.co',
      'lh3.googleusercontent.com',
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compression
  compress: true,
  
  // PWA configuration
  ...(process.env.NODE_ENV === 'production' && {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ];
    },
  }),
};
```

#### 6.2 Runtime Performance Monitoring
```typescript
// lib/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  measurePageLoad() {
    if (typeof window === 'undefined') return;
    
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          const metrics = {
            dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
            tcp: navEntry.connectEnd - navEntry.connectStart,
            request: navEntry.responseStart - navEntry.requestStart,
            response: navEntry.responseEnd - navEntry.responseStart,
            dom: navEntry.domContentLoadedEventEnd - navEntry.responseEnd,
            load: navEntry.loadEventEnd - navEntry.loadEventStart,
            total: navEntry.loadEventEnd - navEntry.navigationStart,
          };
          
          // Send to analytics
          this.reportMetrics('page_load', metrics);
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
  
  measureCoreWebVitals() {
    if (typeof window === 'undefined') return;
    
    // Import web vitals dynamically
    import('web-vitals').then(({ getCLS, getFCP, getFID, getLCP, getTTFB }) => {
      getCLS(this.reportVital);
      getFCP(this.reportVital);
      getFID(this.reportVital);
      getLCP(this.reportVital);
      getTTFB(this.reportVital);
    });
  }
  
  private reportVital = (vital: any) => {
    this.reportMetrics('web_vital', {
      name: vital.name,
      value: vital.value,
      rating: vital.rating,
    });
  };
  
  private reportMetrics(type: string, metrics: any) {
    // Send to multiple analytics platforms
    if (process.env.NODE_ENV === 'production') {
      // Vercel Analytics
      if (window.va) {
        window.va('track', type, metrics);
      }
      
      // Google Analytics
      if (window.gtag) {
        window.gtag('event', type, {
          custom_parameters: metrics,
        });
      }
      
      // Custom analytics endpoint
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, metrics }),
      }).catch(console.error);
    }
  }
}
```

### Phase 7: Security & Compliance

#### 7.1 Security Headers Configuration
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Security headers
  const response = NextResponse.next();
  
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' *.supabase.co *.auth0.com;"
  );
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

#### 7.2 API Security
```typescript
// lib/api-security.ts
import rateLimit from 'express-rate-limit';
import { getSession } from '@auth0/nextjs-auth0';

// Rate limiting
export const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Authentication middleware
export async function requireAuth(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  return session;
}

// Authorization middleware
export function requireRole(role: string) {
  return async (request: NextRequest) => {
    const session = await requireAuth(request);
    
    if (session instanceof NextResponse) {
      return session; // Auth failed
    }
    
    if (session.user.role !== role && session.user.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    return session;
  };
}
```

### Phase 8: Rollback & Recovery Procedures

#### 8.1 Deployment Rollback Strategy
```bash
#!/bin/bash
# scripts/rollback.sh

# Rollback to previous deployment
echo "Rolling back to previous deployment..."

# Get previous deployment
PREVIOUS_DEPLOYMENT=$(vercel ls --limit 2 --token $VERCEL_TOKEN | awk 'NR==3 {print $1}')

if [ -z "$PREVIOUS_DEPLOYMENT" ]; then
  echo "No previous deployment found"
  exit 1
fi

# Promote previous deployment
vercel promote $PREVIOUS_DEPLOYMENT --token $VERCEL_TOKEN

# Verify rollback
echo "Verifying rollback..."
sleep 30

# Health check
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://portfolio.yourdomain.com/api/health)

if [ "$HEALTH_CHECK" == "200" ]; then
  echo "Rollback successful"
else
  echo "Rollback failed - health check returned $HEALTH_CHECK"
  exit 1
fi
```

#### 8.2 Database Recovery Procedures
```sql
-- Database rollback procedures

-- 1. Point-in-time recovery
SELECT pg_create_restore_point('before_migration_YYYYMMDD');

-- 2. Backup before migration
CREATE TEMP TABLE blog_posts_backup AS SELECT * FROM blog_posts;

-- 3. Rollback specific migration
-- Each migration should include rollback instructions
BEGIN;
-- Rollback changes
COMMIT;

-- 4. Verify data integrity
SELECT COUNT(*) FROM blog_posts WHERE status = 'published';
```

## Migration Timeline

### Week 1-2: Infrastructure Setup
- [ ] Set up Vercel project and domains
- [ ] Configure environment variables
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring and alerting

### Week 3-4: Application Migration
- [ ] Deploy Next.js application
- [ ] Migrate content from Hugo
- [ ] Test all functionality
- [ ] Performance optimization

### Week 5-6: Production Preparation
- [ ] Security hardening
- [ ] Load testing
- [ ] Documentation completion
- [ ] Team training

### Week 7: Go-Live
- [ ] Final production deployment
- [ ] DNS cutover
- [ ] Post-deployment verification
- [ ] Monitor for issues

## Success Metrics

### Technical Metrics
- **Build Time**: < 5 minutes
- **Deployment Time**: < 2 minutes
- **Page Load Speed**: < 2 seconds
- **Uptime**: 99.9%
- **Core Web Vitals**: All green scores

### Business Metrics
- **Zero Downtime** during migration
- **100% Feature Parity** with current site
- **Improved Content Management** workflow
- **Reduced Maintenance** overhead

## Risk Mitigation

### High-Risk Items
1. **Data Loss During Migration**
   - Mitigation: Comprehensive backup strategy
   - Testing: Dry-run migrations in staging

2. **Authentication Issues**
   - Mitigation: Thorough Auth0 testing
   - Fallback: Emergency access procedures

3. **Performance Degradation**
   - Mitigation: Performance budgets and monitoring
   - Testing: Load testing before go-live

### Contingency Plans
1. **Rollback Procedures**: Automated rollback to previous version
2. **Emergency Contacts**: 24/7 support team contact list
3. **Communication Plan**: Status page and user notifications
4. **Hot Fixes**: Fast-track deployment for critical issues

This deployment strategy ensures a smooth, secure, and reliable migration to the modern Next.js architecture while maintaining high availability and performance standards.