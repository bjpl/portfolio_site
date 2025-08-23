# Project Structure Documentation

This document provides a comprehensive overview of the portfolio site's directory structure, file organization, and component architecture.

## 📁 Root Directory Overview

```
portfolio_site/
├── 📄 Configuration Files
├── 🎨 Frontend (Hugo)
├── ⚙️ Backend Services
├── 🧪 Testing & QA
├── 📚 Documentation
├── 🚀 Deployment & Infrastructure
└── 📊 Monitoring & Analytics
```

## 🔧 Configuration Files

### Root Configuration
```
├── package.json              # Node.js project configuration
├── package-lock.json         # Dependency lock file
├── netlify.toml             # Netlify deployment configuration
├── docker-compose.yml       # Local development services
├── docker-compose.prod.yml  # Production Docker configuration
├── jest.config.js           # Jest testing configuration
├── playwright.config.js     # E2E testing configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.js           # Vite build configuration
└── vitest.config.ts         # Vitest testing configuration
```

### Hugo Configuration
```
config/
├── _default/
│   ├── hugo.yaml           # Main Hugo configuration
│   ├── languages.yaml      # Multilingual setup
│   ├── menus.en.yaml       # English navigation
│   ├── menus.es.yaml       # Spanish navigation
│   ├── outputs.yaml        # Output formats (HTML, JSON, RSS)
│   └── params.yaml         # Site parameters
├── environments/           # Environment-specific configs
└── secrets/               # Secure configuration (git-ignored)
```

## 🎨 Frontend Architecture

### Hugo Site Structure
```
├── content/                # Markdown content files
│   ├── _index.md          # Homepage content
│   ├── blog/              # Blog posts
│   ├── me/                # About section
│   ├── teaching-learning/ # Educational content
│   │   ├── sla-theory/    # SLA theory articles
│   │   └── links/         # Resource links
│   ├── tools/             # Tool descriptions
│   │   ├── built/         # Custom-built tools
│   │   ├── strategies/    # Learning strategies
│   │   └── what-i-use/    # Tool reviews
│   ├── writing/           # Creative writing
│   │   └── poetry/        # Poetry collection
│   ├── photography/       # Photography portfolio
│   └── es/                # Spanish translations
│
├── layouts/               # Hugo templates
│   ├── _default/         # Default templates
│   │   ├── baseof.html   # Base template
│   │   ├── single.html   # Single page template
│   │   ├── list.html     # List page template
│   │   └── terms.html    # Taxonomy terms
│   ├── partials/         # Reusable components
│   │   ├── header.html   # Site header
│   │   ├── footer.html   # Site footer
│   │   └── components/   # UI components
│   ├── shortcodes/       # Content shortcodes
│   │   ├── youtube.html  # YouTube embed
│   │   ├── codepen.html  # CodePen embed
│   │   └── link-item.html # Link formatting
│   └── index.html        # Homepage template
│
└── static/               # Static assets
    ├── css/              # Stylesheets
    │   ├── main.css      # Main styles
    │   ├── links-*.css   # Link page styles
    │   └── content-pages.css # Content styling
    ├── js/               # JavaScript files
    │   ├── analytics.js  # Analytics tracking
    │   ├── theme-toggle.js # Dark mode toggle
    │   ├── language-switcher.js # Language switching
    │   └── links-*.js    # Link page functionality
    ├── images/           # Static images
    ├── admin/            # Admin panel files
    └── uploads/          # User uploaded content
```

### Public Directory (Generated)
```
public/                   # Hugo build output
├── index.html           # Generated homepage
├── sitemap.xml          # SEO sitemap
├── robots.txt           # Search engine directives
├── manifest.json        # PWA manifest
├── _redirects           # Netlify redirects
├── blog/                # Generated blog pages
├── es/                  # Spanish site version
└── assets/              # Processed assets
```

## ⚙️ Backend Services

### Main Backend Structure
```
backend/
├── package.json         # Backend dependencies
├── src/
│   ├── server.js       # Main server entry point
│   ├── simple-cms-server.js # Lightweight CMS
│   ├── content-manager.js   # Content management
│   ├── multilingual-api.js  # Translation API
│   └── websocket.js    # WebSocket server
│
├── config/             # Backend configuration
│   ├── database.js     # Database config
│   ├── media.js        # Media storage config
│   └── index.js        # Main config
│
├── models/             # Data models
│   ├── User.js         # User model
│   ├── Project.js      # Project model
│   ├── BlogPost.js     # Blog post model
│   ├── MediaAsset.js   # Media asset model
│   └── index.js        # Model exports
│
├── controllers/        # Business logic
│   └── api/
│       └── ProjectController.js
│
├── routes/             # API routes
│   ├── auth.js         # Authentication
│   ├── admin.js        # Admin operations
│   ├── media.js        # Media management
│   └── api/
│       ├── index.js    # API router
│       ├── projects.js # Project endpoints
│       └── v1/         # API v1
│           ├── admin.js
│           ├── auth.js
│           ├── blog.js
│           ├── contact.js
│           ├── media.js
│           └── users.js
│
├── services/           # Business services
│   ├── authService.js  # Authentication
│   ├── contentService.js # Content management
│   ├── mediaService.js # Media handling
│   ├── portfolioService.js # Portfolio ops
│   ├── searchService.js # Search functionality
│   └── hugoService.js  # Hugo integration
│
├── middleware/         # Express middleware
│   ├── auth.js         # Authentication
│   ├── validation.js   # Input validation
│   ├── security.js     # Security headers
│   └── errorHandler.js # Error handling
│
├── migrations/         # Database migrations
├── seeders/            # Database seeds
└── uploads/            # File uploads
```

### CMS Module Structure
```
backend/src/cms/
├── controllers/        # CMS controllers
│   ├── AdminController.js
│   ├── BlogController.js
│   ├── MediaController.js
│   └── PortfolioController.js
├── models/            # CMS-specific models
│   ├── Blog.js
│   ├── BlogCategory.js
│   ├── Comment.js
│   └── MediaAsset.js
├── routes/            # CMS routes
│   ├── adminRoutes.js
│   ├── blogRoutes.js
│   ├── mediaRoutes.js
│   └── portfolioRoutes.js
└── services/          # CMS services
    ├── BlogService.js
    ├── MediaService.js
    └── SearchService.js
```

### Authentication Module
```
backend/src/auth/
├── controllers/       # Auth controllers
│   ├── AuthController.js
│   └── ApiKeyController.js
├── middleware/        # Auth middleware
│   ├── AuthMiddleware.js
│   ├── RateLimitMiddleware.js
│   └── SessionMiddleware.js
├── models/           # Auth models
│   ├── ApiKey.js
│   ├── RefreshToken.js
│   └── OAuthProvider.js
├── services/         # Auth services
│   ├── TokenService.js
│   ├── OAuthService.js
│   └── PasswordService.js
└── utils/            # Auth utilities
    └── SecurityAudit.js
```

## 🗄️ Database Layer (Supabase)

### Supabase Structure
```
supabase/
├── config.toml         # Supabase configuration
├── migrations/         # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 20240101000002_auth_setup.sql
│   ├── 20240101000003_storage_buckets.sql
│   ├── 20240101000004_functions.sql
│   ├── 20240101000005_triggers.sql
│   └── 20240101000006_rls_policies.sql
├── functions/          # Edge functions
│   ├── _shared/
│   │   └── cors.ts
│   └── portfolio-api/
│       └── index.ts
├── seed/              # Database seeding
│   └── seed.sql
├── types/             # TypeScript types
│   └── database.types.ts
└── lib/               # Helper libraries
    ├── api-helpers.js
    ├── logger.js
    └── supabase-admin.js
```

### Database Schema Overview
```sql
-- Core Tables
users                   -- User accounts
roles                   -- User roles
projects               -- Portfolio projects
blog_posts             -- Blog content
media_assets           -- File storage
tags                   -- Content tags
skills                 -- Technical skills
experiences            -- Work experience
education              -- Educational background
testimonials           -- Recommendations

-- Junction Tables
project_tags           -- Project-tag relationships
project_skills         -- Project-skill relationships
user_roles             -- User-role assignments

-- CMS Tables
content_versions       -- Version control
workflow_states        -- Content workflow
audit_logs             -- Change tracking
```

## 🌐 Serverless Functions (Netlify)

```
netlify/
├── functions/          # Serverless functions
│   ├── auth-*.js      # Authentication endpoints
│   ├── blog.js        # Blog API
│   ├── contact.js     # Contact form
│   ├── health.js      # Health checks
│   ├── projects.js    # Project API
│   └── utils/         # Shared utilities
│       ├── auth-utils.js
│       ├── supabase.js
│       └── security-middleware.js
└── edge-functions/    # Edge functions
    ├── auth-*.ts      # Auth edge functions
    └── test-edge.ts   # Edge testing
```

## 🧪 Testing Structure

```
tests/
├── unit/              # Unit tests
│   ├── auth.test.js
│   ├── portfolio.test.js
│   ├── utils.test.ts
│   └── middleware/
├── integration/       # Integration tests
│   └── api-flow.test.js
├── e2e/              # End-to-end tests
│   ├── auth.e2e.test.js
│   └── content-management.e2e.test.js
├── performance/      # Performance tests
│   └── load-testing.js
├── security/         # Security tests
│   └── security-testing.js
├── accessibility/    # A11y tests
│   ├── accessibility-test-runner.html
│   └── contrast-checker.js
├── supabase/         # Supabase-specific tests
│   ├── auth-flow.test.js
│   ├── crud-operations.test.js
│   └── rls-policies.test.js
├── fixtures/         # Test data
│   └── test-data.js
└── setup.js          # Test configuration
```

## 📚 Documentation

```
docs/
├── API_DOCUMENTATION.md          # API reference
├── ARCHITECTURE.md              # System architecture
├── DEPLOYMENT_CONFIGURATION_GUIDE.md # Deploy guide
├── DEVELOPMENT.md               # Dev workflow
├── SECURITY_BEST_PRACTICES.md  # Security guide
├── SUPABASE_INTEGRATION_GUIDE.md # DB setup
├── USER_GUIDE_CONTENT_EDITORS.md # Content editing
├── architecture/                # Architecture docs
│   ├── BACKEND_ARCHITECTURE_DESIGN.md
│   ├── COMPONENT_DIAGRAMS.md
│   └── TECHNICAL_SPECIFICATIONS.md
├── auth/                        # Auth documentation
├── cms/                         # CMS documentation
└── setup/                       # Setup guides
```

## 🚀 Deployment & Infrastructure

### Docker Configuration
```
├── Dockerfile                   # Main application
├── Dockerfile.nginx            # Nginx reverse proxy
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
└── docker-compose.monitoring.yml # Monitoring stack
```

### Cloud Deployment
```
backend/deploy/
├── cloud/                      # Cloud platform configs
│   ├── railway.toml           # Railway deployment
│   ├── render.yaml            # Render deployment
│   └── vercel.json            # Vercel deployment
├── k8s/                       # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── configmap.yaml
└── scripts/                   # Deployment scripts
    ├── deploy.sh
    ├── backup.sh
    └── setup-production.sh
```

### Infrastructure as Code
```
infrastructure/
├── terraform/                 # Terraform configs
│   └── main.tf
├── k8s/                      # Kubernetes
│   └── deployment.yml
└── scripts/                  # Infrastructure scripts
    └── backup-service.sh
```

## 📊 Monitoring & Analytics

```
monitoring/
├── prometheus.yml            # Metrics collection
├── alertmanager.yml         # Alert configuration
├── grafana/                 # Visualization
│   ├── dashboards/
│   │   └── portfolio-overview.json
│   └── provisioning/
├── loki-config.yml          # Log aggregation
└── promtail-config.yml      # Log collection

logs/                        # Application logs
├── analytics/               # Analytics data
├── application-*.log        # App logs
└── error-*.log             # Error logs
```

## 🛠 Development Tools

```
tools/                       # Development utilities
├── analytics/               # Analytics tools
├── backend/                 # Backend utilities
├── monitor/                # Monitoring tools
├── optimizer/              # Performance optimization
├── performance/            # Performance testing
├── search/                 # Search functionality
└── translator/             # Translation utilities
    ├── cli.js
    ├── translator.js
    └── utils.js
```

## 📱 Frontend Assets

### Admin Panel
```
static/admin/               # CMS interface
├── index.html             # Admin dashboard
├── login.html             # Login page
├── dashboard.html         # Main dashboard
├── portfolio.html         # Portfolio management
├── media-library.html     # Media management
├── analytics.html         # Analytics dashboard
├── styles.css             # Admin styles
├── js/                    # Admin JavaScript
│   ├── api-config.js
│   ├── auth-manager.js
│   └── utils.js
└── utils/                 # Admin utilities
    ├── auth-check.js
    └── sanitizer.js
```

### Content Editor
```
editor/                    # Content editing tools
├── enhanced-content-editor.html
└── EDITOR-README.md
```

## 🔄 Data Flow Architecture

### Content Management Flow
```
User Input → Admin Interface → Backend API → Supabase DB → Hugo Generation → Static Site
```

### Media Processing Flow
```
Upload → Validation → Processing → CDN Storage → Database Record → Frontend Display
```

### Authentication Flow
```
Login → Supabase Auth → JWT Token → Session Storage → Protected Routes
```

### Deployment Pipeline
```
Git Push → GitHub Actions → Build → Test → Deploy → Monitor
```

## 🧩 Key Components

### Hugo Components
- **Content Types**: Blog, portfolio, tools, writing
- **Multilingual**: EN/ES support with automatic routing
- **SEO**: Meta tags, structured data, sitemaps
- **Performance**: Lazy loading, minification, CDN

### Backend Components
- **API Server**: RESTful API with Express.js
- **CMS**: Content management with rich editor
- **Authentication**: JWT-based with Supabase
- **File Handling**: Media upload and processing

### Database Components
- **User Management**: Authentication and authorization
- **Content Storage**: Versioned content with workflow
- **Media Assets**: File metadata and relationships
- **Analytics**: Usage tracking and metrics

## 🔐 Security Layers

### Frontend Security
- Content Security Policy (CSP)
- XSS protection
- Input sanitization
- Authentication checks

### Backend Security
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention

### Database Security
- Row Level Security (RLS)
- Encrypted connections
- Backup encryption
- Access logging

---

*This structure documentation is maintained alongside the codebase and updated with each major architectural change.*