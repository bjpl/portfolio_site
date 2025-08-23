# Setup Guide

Complete setup instructions for the Brandon JP Lambert Portfolio Site.

## 🔧 Prerequisites

### Required Software
- **Node.js** 18.0+ with npm
- **Hugo** 0.121+ (Extended version)
- **Git** for version control
- **Docker** (optional, for containerized development)

### Platform Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: Minimum 4GB (8GB+ recommended)
- **Disk Space**: 2GB+ free space

### Account Setup
1. **Supabase Account**: [https://supabase.com](https://supabase.com)
2. **Netlify Account**: [https://netlify.com](https://netlify.com) (for deployment)
3. **Cloudinary Account**: [https://cloudinary.com](https://cloudinary.com) (for media management)
4. **Google Analytics**: [https://analytics.google.com](https://analytics.google.com) (optional)

## 🚀 Quick Setup (5 minutes)

### 1. Clone and Install
```bash
# Clone the repository
git clone <your-repository-url>
cd portfolio_site

# Install all dependencies
npm install

# Install Hugo (if not already installed)
# macOS
brew install hugo

# Windows (with Chocolatey)
choco install hugo-extended

# Linux
sudo snap install hugo
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit the environment file
nano .env.local  # or use your preferred editor
```

### 3. Quick Start
```bash
# Start all services (Hugo + Backend)
npm run dev

# Access points:
# - Portfolio: http://localhost:1313
# - Admin: http://localhost:3000/admin
```

## 🔐 Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root:

```bash
# ==============================================
# CORE APPLICATION SETTINGS
# ==============================================
NODE_ENV=development
PORT=3000
SITE_URL=http://localhost:1313

# ==============================================
# SUPABASE CONFIGURATION
# ==============================================
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database connection (for direct access if needed)
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres

# ==============================================
# AUTHENTICATION SETTINGS
# ==============================================
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
SESSION_SECRET=your-session-secret-minimum-32-chars

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# ==============================================
# MEDIA & STORAGE
# ==============================================
# Cloudinary (recommended for media)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Alternative: Supabase Storage
SUPABASE_STORAGE_BUCKET=media-assets

# ==============================================
# EXTERNAL SERVICES
# ==============================================
# Google Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Email (for contact forms)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ==============================================
# SECURITY SETTINGS
# ==============================================
CORS_ORIGIN=http://localhost:1313,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# DEVELOPMENT SETTINGS
# ==============================================
LOG_LEVEL=debug
ENABLE_DEBUG=true
HOT_RELOAD=true
```

### Environment-Specific Files
```bash
# Development
.env.local

# Production
.env.production

# Testing
.env.test
```

## 🗄️ Supabase Setup

### 1. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and set project details
4. Wait for project creation (2-3 minutes)

### 2. Configure Database
```bash
# Run database migrations
npm run supabase:migrate

# Seed initial data
npm run supabase:seed
```

### Manual Database Setup (Alternative)
```sql
-- Run these SQL commands in Supabase SQL editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create main tables
\i supabase/migrations/001_initial_schema.sql

-- Set up Row Level Security
\i supabase/migrations/20240101000006_rls_policies.sql

-- Create storage buckets
\i supabase/migrations/20240101000003_storage_buckets.sql
```

### 3. Configure Authentication
In Supabase Dashboard:
1. **Authentication > Settings**
   - Enable email confirmation: No (for development)
   - Enable phone confirmation: No
   - Site URL: `http://localhost:1313`
   - Redirect URLs: `http://localhost:1313/auth/callback`

2. **Authentication > Providers**
   - Configure OAuth providers (optional):
     - Google: Add client ID and secret
     - GitHub: Add client ID and secret

### 4. Set Up Storage
1. **Storage > Buckets**
   - Create bucket: `media-assets`
   - Public: Yes
   - File size limit: 50MB
   - Allowed MIME types: `image/*,video/*,application/pdf`

2. **Storage > Policies**
   ```sql
   -- Allow public access to media assets
   CREATE POLICY "Public read access" ON storage.objects
   FOR SELECT TO public USING (bucket_id = 'media-assets');
   
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated upload" ON storage.objects
   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media-assets');
   ```

## 🎨 Hugo Configuration

### Site Configuration
Update `config/_default/hugo.yaml`:

```yaml
baseURL: "http://localhost:1313"  # Change for production
title: "Brandon JP Lambert"
languageCode: "en-us"
defaultContentLanguage: "en"

# Build settings
buildDrafts: true
buildFuture: true
enableRobotsTXT: true
enableGitInfo: true

# Taxonomies
taxonomies:
  tag: tags
  category: categories

# Markup settings
markup:
  goldmark:
    renderer:
      unsafe: true
  highlight:
    style: github
    lineNos: true

# Output formats
outputs:
  home: ["HTML", "RSS", "JSON"]
  page: ["HTML"]
  section: ["HTML", "RSS"]
```

### Multilingual Setup
Update `config/_default/languages.yaml`:

```yaml
en:
  languageName: "English"
  weight: 1
  contentDir: "content"
  params:
    description: "Educator, Developer, Language Learning Innovator"

es:
  languageName: "Español"
  weight: 2
  contentDir: "content/es"
  params:
    description: "Educador, Desarrollador, Innovador en Aprendizaje de Idiomas"
```

## 🔌 Backend Configuration

### Database Configuration
Update `backend/src/config/database.js`:

```javascript
module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'db.your-project-id.supabase.co',
      port: 5432,
      user: 'postgres',
      password: process.env.SUPABASE_PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: '../migrations'
    },
    seeds: {
      directory: '../seeders'
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
    migrations: {
      directory: '../migrations'
    }
  }
};
```

### CMS Configuration
Update `backend/src/config/media.js`:

```javascript
module.exports = {
  storage: {
    provider: 'cloudinary', // or 'supabase'
    cloudinary: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    },
    supabase: {
      bucket: 'media-assets',
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  },
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/*', 'video/*', 'application/pdf'],
    quality: 80
  }
};
```

## 🌐 Netlify Configuration

### netlify.toml Setup
```toml
[build]
  publish = "public"
  command = "npm run build:netlify"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
  HUGO_VERSION = "0.121.0"

[[redirects]]
  from = "/admin/*"
  to = "/admin/index.html"
  status = 200

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
```

### Environment Variables in Netlify
In Netlify Dashboard > Site Settings > Environment Variables:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## 🧪 Development Setup

### Install Development Tools
```bash
# Install global tools
npm install -g @playwright/test
npm install -g pa11y-ci

# Install project dependencies
npm install

# Install Git hooks
npm run prepare
```

### VS Code Configuration
Create `.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.associations": {
    "*.html": "html"
  },
  "emmet.includeLanguages": {
    "hugo": "html"
  }
}
```

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "budparr.language-hugo-vscode",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright"
  ]
}
```

## 🔍 Verification & Testing

### Health Check
```bash
# Start services
npm run dev

# Check endpoints
curl http://localhost:3000/api/health
curl http://localhost:1313

# Run health check script
npm run test:health
```

### Test Configuration
```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests
npm test
```

### Database Connection Test
```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
client.from('profiles').select('*').limit(1).then(console.log);
"
```

## 🚨 Troubleshooting

### Common Issues

#### Hugo Not Found
```bash
# Install Hugo extended
# macOS
brew install hugo

# Windows
winget install Hugo.Hugo.Extended

# Verify installation
hugo version
```

#### Supabase Connection Failed
1. Check environment variables
2. Verify project URL and keys
3. Check network connectivity
4. Verify RLS policies

#### Build Failures
```bash
# Clear cache
hugo --cleanDestinationDir
rm -rf public/

# Reinstall dependencies
rm -rf node_modules/
npm install

# Check Hugo config
hugo config
```

#### Permission Errors
```bash
# Fix file permissions
chmod +x scripts/*.sh
chmod +x *.ps1

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## 🔧 Advanced Configuration

### Docker Development
```bash
# Start with Docker Compose
docker-compose up -d

# Access services:
# - Portfolio: http://localhost:1313
# - Admin: http://localhost:3000
# - Database: localhost:5432
```

### Custom Domain Setup
1. Update `config/_default/hugo.yaml`:
   ```yaml
   baseURL: "https://your-domain.com"
   ```

2. Configure Netlify DNS:
   - Add custom domain
   - Configure SSL certificate
   - Set up redirects

### Performance Monitoring
```bash
# Install monitoring tools
npm install -g lighthouse
npm install -g webpack-bundle-analyzer

# Run performance audit
npm run audit:performance
```

## 📚 Next Steps

1. **Content Creation**: Start adding content through the admin panel
2. **Customization**: Modify themes and layouts
3. **Deployment**: Set up production environment
4. **Monitoring**: Configure analytics and performance tracking
5. **Security**: Review and enhance security settings

## 🆘 Support

- **Documentation**: [Project Wiki](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/portfolio-site/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/portfolio-site/discussions)
- **Email**: technical@brandonjplambert.com

---

*Setup complete! You're ready to start developing and customizing your portfolio site.*