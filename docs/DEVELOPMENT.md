# Development Guide

Complete development workflow and testing guide for the Brandon JP Lambert Portfolio Site.

## 🚀 Development Workflow

### Local Development Setup

```bash
# 1. Start development environment
npm run dev

# This starts:
# - Hugo dev server (localhost:1313) with live reload
# - Backend CMS server (localhost:3000) with nodemon
# - File watchers for automatic rebuilding
```

### Development Commands

```bash
# Frontend Development
hugo server -D                 # Hugo development server
hugo server --bind=0.0.0.0    # Hugo server accessible externally
hugo --buildDrafts             # Build including draft content

# Backend Development
npm run server:dev             # Backend with auto-restart
npm run server                 # Backend production mode
npm run dashboard              # Admin dashboard only

# Full Stack Development
npm run dev                    # All services concurrently
npm run all                    # All services (alternative)

# Building & Testing
npm run build                  # Production build
npm run build:netlify          # Netlify-specific build
npm test                       # Run all tests
npm run lint                   # Code linting
npm run format                 # Code formatting
```

## 🏗 Architecture Overview

### Frontend Architecture (Hugo)
```
Content (Markdown) → Hugo Processing → Static HTML → Netlify CDN
     ↓                    ↓               ↓
 Git Storage         Templates      Live Website
                    + Assets      (localhost:1313)
```

### Backend Architecture (Node.js + Supabase)
```
Admin Panel → Express API → Supabase → Content Files
     ↓            ↓           ↓           ↓
React/HTML   REST Endpoints  Database   Markdown
(localhost:3000)              PostgreSQL   Files
```

### Data Flow
```
1. Content Creation: Admin Panel → API → Database
2. File Generation: Database → Hugo → Static Files
3. Deployment: Git Push → Netlify → Live Site
4. Real-time: WebSocket → Live Updates → Admin Dashboard
```

## 🧰 Development Tools

### Code Quality Tools
```bash
# ESLint - Code linting
npm run lint                   # Check all files
npm run lint:fix              # Auto-fix issues

# Prettier - Code formatting
npm run format                 # Format all files
npm run format:check          # Check formatting

# TypeScript - Type checking
npm run typecheck             # Validate types

# Pre-commit hooks
npm run pre-commit            # Run before commits
```

### Development Utilities
```bash
# File watching
npm run watch                 # Watch for file changes

# Cache management
npm run cache:clear           # Clear application cache
npm run cache:warm           # Pre-warm cache

# Database utilities
npm run db:migrate           # Run database migrations
npm run db:seed              # Seed test data
npm run db:reset             # Reset database
```

## 🧪 Testing Strategy

### Test Pyramid
```
E2E Tests (Playwright)
    ↑
Integration Tests (Jest + Supertest)
    ↑
Unit Tests (Jest)
    ↑
Static Analysis (ESLint, TypeScript)
```

### Unit Testing
```bash
# Run unit tests
npm run test:unit

# Run specific test file
npm test -- auth.test.js

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

**Unit Test Structure:**
```javascript
// tests/unit/services/authService.test.js
describe('AuthService', () => {
  describe('validateUser', () => {
    it('should validate correct credentials', async () => {
      const result = await authService.validateUser(validCredentials);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid credentials', async () => {
      const result = await authService.validateUser(invalidCredentials);
      expect(result.success).toBe(false);
    });
  });
});
```

### Integration Testing
```bash
# Run integration tests
npm run test:integration

# Test specific API endpoints
npm run test:api

# Test Supabase integration
npm run test:supabase
```

**Integration Test Example:**
```javascript
// tests/integration/api-flow.test.js
describe('API Integration', () => {
  it('should create and retrieve a blog post', async () => {
    // Create post
    const createResponse = await request(app)
      .post('/api/v1/blog')
      .send(testBlogPost)
      .expect(201);
    
    // Retrieve post
    const getResponse = await request(app)
      .get(`/api/v1/blog/${createResponse.body.id}`)
      .expect(200);
    
    expect(getResponse.body.title).toBe(testBlogPost.title);
  });
});
```

### End-to-End Testing
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific E2E test
npx playwright test auth.e2e.test.js
```

**E2E Test Example:**
```javascript
// tests/e2e/auth.e2e.test.js
test('admin login flow', async ({ page }) => {
  await page.goto('/admin/login');
  
  await page.fill('[data-testid=email]', 'admin@example.com');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=submit]');
  
  await expect(page).toHaveURL('/admin/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### Performance Testing
```bash
# Load testing
npm run test:performance

# Lighthouse audit
npm run audit:performance

# Bundle analysis
npm run analyze:bundle
```

### Security Testing
```bash
# Security audit
npm run test:security

# Dependency audit
npm audit

# OWASP ZAP scan
npm run security:zap
```

### Accessibility Testing
```bash
# Accessibility testing
npm run test:accessibility

# Pa11y audit
npm run audit:a11y

# Axe-core testing
npm run test:axe
```

## 🔧 Development Configuration

### Environment Setup
```bash
# Development environment
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEBUG=true
HOT_RELOAD=true

# Database (local development)
DATABASE_URL=postgresql://postgres:password@localhost:5432/portfolio_dev

# External services (development)
SUPABASE_URL=https://your-dev-project.supabase.co
CLOUDINARY_CLOUD_NAME=your-dev-cloud
```

### Hugo Development Configuration
```yaml
# config/_default/hugo.yaml (development overrides)
buildDrafts: true
buildFuture: true
enableGitInfo: false
disableFastRender: false

params:
  environment: development
  debug: true
  analytics:
    enabled: false
```

### VS Code Configuration
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.html": "html"
  },
  "emmet.includeLanguages": {
    "hugo": "html"
  },
  "css.validate": false,
  "scss.validate": false
}
```

### Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.js",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*"
      },
      "restart": true,
      "runtimeExecutable": "nodemon",
      "console": "integratedTerminal"
    }
  ]
}
```

## 📝 Content Development

### Content Structure
```
content/
├── _index.md              # Homepage
├── blog/                  # Blog posts
│   ├── _index.md         # Blog index
│   └── post-name.md      # Individual posts
├── me/                   # About section
├── teaching-learning/    # Educational content
├── tools/                # Tool descriptions
├── writing/              # Creative writing
└── es/                   # Spanish translations
```

### Content Creation Workflow
1. **Create Content**: Use admin panel or direct file editing
2. **Preview**: Hugo dev server shows changes instantly
3. **Validate**: Run content validation scripts
4. **Review**: Content approval workflow (if applicable)
5. **Publish**: Commit to git for deployment

### Hugo Shortcodes
```html
<!-- YouTube video embed -->
{{< youtube "video-id" >}}

<!-- CodePen embed -->
{{< codepen "pen-id" >}}

<!-- Custom link item -->
{{< link-item "title" "url" "description" >}}

<!-- Links section -->
{{< links-section "Category Name" >}}
  {{< link-item "Item 1" "url1" "desc1" >}}
  {{< link-item "Item 2" "url2" "desc2" >}}
{{< /links-section >}}
```

### Multilingual Development
```bash
# Content structure for multilingual
content/
├── _index.md              # English homepage
├── blog/                  # English blog
└── es/                    # Spanish content
    ├── _index.md          # Spanish homepage
    └── blog/              # Spanish blog

# Template usage
{{ if .IsTranslated }}
  {{ range .Translations }}
    <a href="{{ .Permalink }}">{{ .Language.LanguageName }}</a>
  {{ end }}
{{ end }}
```

## 🎨 Frontend Development

### CSS Architecture
```
static/css/
├── main.css              # Base styles
├── components/           # Component styles
├── pages/               # Page-specific styles
└── utilities/           # Utility classes
```

### JavaScript Development
```
static/js/
├── main.js              # Core functionality
├── components/          # UI components
├── pages/              # Page-specific scripts
└── utils/              # Utility functions
```

### Theme Development
```html
<!-- layouts/_default/baseof.html -->
<!DOCTYPE html>
<html lang="{{ .Site.Language.Lang }}">
<head>
  {{ partial "meta/head.html" . }}
</head>
<body class="{{ with .Params.body_class }}{{ . }}{{ end }}">
  {{ partial "header.html" . }}
  
  <main>
    {{ block "main" . }}{{ end }}
  </main>
  
  {{ partial "footer.html" . }}
  {{ partial "scripts.html" . }}
</body>
</html>
```

## ⚙️ Backend Development

### API Development
```javascript
// backend/src/routes/api/projects.js
const express = require('express');
const { authenticateUser } = require('../../middleware/auth');
const ProjectController = require('../../controllers/ProjectController');

const router = express.Router();

// GET /api/projects
router.get('/', ProjectController.getAll);

// POST /api/projects (authenticated)
router.post('/', authenticateUser, ProjectController.create);

// PUT /api/projects/:id (authenticated)
router.put('/:id', authenticateUser, ProjectController.update);

module.exports = router;
```

### Database Development
```javascript
// backend/src/models/Project.js
const { Model } = require('objection');

class Project extends Model {
  static get tableName() {
    return 'projects';
  }
  
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        id: { type: 'integer' },
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string' },
        github_url: { type: 'string', format: 'uri' },
        demo_url: { type: 'string', format: 'uri' },
        created_at: { type: 'string', format: 'date-time' }
      }
    };
  }
  
  static get relationMappings() {
    return {
      tags: {
        relation: Model.ManyToManyRelation,
        modelClass: require('./Tag'),
        join: {
          from: 'projects.id',
          through: {
            from: 'project_tags.project_id',
            to: 'project_tags.tag_id'
          },
          to: 'tags.id'
        }
      }
    };
  }
}

module.exports = Project;
```

### Service Development
```javascript
// backend/src/services/ProjectService.js
class ProjectService {
  async createProject(projectData, userId) {
    try {
      // Validate input
      const validatedData = await this.validateProjectData(projectData);
      
      // Create project
      const project = await Project.query().insert({
        ...validatedData,
        user_id: userId,
        created_at: new Date()
      });
      
      // Process tags
      if (projectData.tags) {
        await this.addProjectTags(project.id, projectData.tags);
      }
      
      return project;
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }
  
  async validateProjectData(data) {
    // Add validation logic
    return data;
  }
}

module.exports = new ProjectService();
```

## 🔐 Security Development

### Authentication Implementation
```javascript
// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateUser };
```

### Input Validation
```javascript
// backend/src/middleware/validation.js
const Joi = require('joi');

const validateProject = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().required(),
    github_url: Joi.string().uri().optional(),
    demo_url: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string()).optional()
  });
  
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }
  
  next();
};

module.exports = { validateProject };
```

## 📊 Performance Optimization

### Frontend Performance
```javascript
// Lazy loading images
const lazyImages = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      observer.unobserve(img);
    }
  });
});

lazyImages.forEach(img => imageObserver.observe(img));
```

### Backend Performance
```javascript
// Redis caching middleware
const redis = require('redis');
const client = redis.createClient();

const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      res.sendResponse = res.json;
      res.json = (body) => {
        client.setex(key, duration, JSON.stringify(body));
        res.sendResponse(body);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};
```

## 🐛 Debugging

### Backend Debugging
```javascript
// Debug logging
const debug = require('debug')('portfolio:api');

debug('Processing request for %s', req.path);
debug('User authenticated: %o', req.user);

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### Frontend Debugging
```javascript
// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.debugPortfolio = {
    clearCache: () => localStorage.clear(),
    toggleDebug: () => document.body.classList.toggle('debug-mode'),
    logState: () => console.log('Current state:', getAppState())
  };
}
```

## 🚀 Deployment Preparation

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] Environment variables configured
- [ ] Build process verified
- [ ] Security audit complete
- [ ] Performance benchmarks met

### Build Process
```bash
# Production build
npm run build

# Verify build
npm run build:verify

# Run pre-deployment tests
npm run test:ci
```

## 📚 Resources

### Documentation Links
- [Hugo Documentation](https://gohugo.io/documentation/)
- [Supabase Docs](https://supabase.com/docs)
- [Jest Testing](https://jestjs.io/docs)
- [Playwright E2E](https://playwright.dev/)

### Best Practices
- Keep functions small and focused
- Write tests for critical paths
- Use meaningful commit messages
- Document API changes
- Regular security updates

---

*This development guide is updated regularly. Check back for the latest workflows and best practices.*