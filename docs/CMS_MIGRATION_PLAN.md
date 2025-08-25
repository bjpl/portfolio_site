# CMS Migration Plan: Supabase to Decap CMS

**Date**: 2025-08-25  
**Status**: Ready for Execution  
**Estimated Timeline**: 3-7 days  
**Migration Type**: Database CMS → Git-based CMS

## Executive Summary

This document outlines the complete migration from the current broken Supabase-based CMS to a functional Decap CMS (formerly Netlify CMS) solution. The migration will provide immediate relief with a working content management system while maintaining all existing Hugo site functionality.

## Current System Analysis

### What's Broken ❌
- **Supabase Authentication**: Complex auth flows failing intermittently
- **Database Dependencies**: 25+ Netlify functions relying on Supabase
- **Admin Panel**: Overly complex with 70+ admin files
- **Environment Variables**: Fragmented across multiple config files
- **Error Handling**: Complex fallback systems causing confusion
- **Edge Functions**: Multiple edge functions for auth middleware

### What's Working ✅
- **Hugo Site Structure**: Solid foundation with proper content organization
- **Content Organization**: Well-structured markdown files in `/content/`
- **Multilingual Setup**: English/Spanish content properly organized
- **Netlify Deployment**: Build and hosting infrastructure functional
- **Static Assets**: Images, CSS, JavaScript properly organized

### Content Inventory
```
📁 content/
├── 📁 blog/ (3 posts)
├── 📁 teaching-learning/ (13 SLA theory posts)
├── 📁 tools/ (15+ tools and strategies)
├── 📁 writing/poetry/ (7 poems)
├── 📁 me/work/ (portfolio content)
├── 📁 cv/ (CV content)
├── 📁 services/ (services content)
└── 📁 es/ (Spanish translations)

Total: ~75 markdown files with frontmatter
```

## Migration Strategy: Supabase → Decap CMS

### Phase 1: Immediate Relief (Day 1) 🚑

**Objective**: Deploy working CMS within 24 hours

#### 1.1 Install Decap CMS
```bash
# Add Decap CMS to existing Hugo site
npm install decap-cms-app
```

#### 1.2 Create Basic Admin Interface
**File**: `static/admin/index.html`
```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Content Manager</title>
</head>
<body>
  <!-- Decap CMS -->
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</body>
</html>
```

#### 1.3 Configure Basic CMS
**File**: `static/admin/config.yml`
```yaml
backend:
  name: git-gateway
  branch: main

media_folder: "static/images/uploads"
public_folder: "/images/uploads"

collections:
  - name: "blog"
    label: "Blog"
    folder: "content/blog"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Date", name: "date", widget: "datetime"}
      - {label: "Draft", name: "draft", widget: "boolean", default: false}
      - {label: "Description", name: "description", widget: "string"}
      - {label: "Categories", name: "categories", widget: "list"}
      - {label: "Tags", name: "tags", widget: "list"}
      - {label: "Body", name: "body", widget: "markdown"}
      
  - name: "pages"
    label: "Pages" 
    files:
      - label: "About Me"
        name: "about"
        file: "content/me/_index.md"
        fields:
          - {label: "Title", name: "title", widget: "string"}
          - {label: "Date", name: "date", widget: "datetime"}
          - {label: "Body", name: "body", widget: "markdown"}
```

#### 1.4 Enable Netlify Identity
```bash
# In Netlify Dashboard:
# 1. Go to Site Settings > Identity
# 2. Enable Identity
# 3. Set registration to "Invite only"
# 4. Enable Git Gateway
```

#### 1.5 Clean Deployment
```bash
# Remove broken admin interface
rm -rf static/admin/js static/admin/css static/admin/*.html
# Keep only new Decap CMS files
ls static/admin/ # Should show: index.html, config.yml

# Deploy
git add .
git commit -m "Deploy Decap CMS - Phase 1"
git push origin main
```

**Success Criteria for Phase 1**:
- ✅ CMS accessible at `/admin/`
- ✅ Can login with Netlify Identity
- ✅ Can edit existing blog posts
- ✅ Can create new blog posts
- ✅ Hugo site still builds and deploys

### Phase 2: Data Migration & Enhancement (Days 2-3) 🔄

#### 2.1 Export Supabase Data (if any exists)
```javascript
// Script: scripts/export-supabase-data.js
const { createClient } = require('@supabase/supabase-js');

const exportData = async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  // Export any dynamic content to markdown files
  const { data: projects } = await supabase.from('projects').select('*');
  const { data: posts } = await supabase.from('blog_posts').select('*');
  
  // Convert to Hugo markdown format
  projects?.forEach(project => {
    const frontmatter = `---
title: "${project.title}"
date: ${project.created_at}
draft: ${!project.is_public}
description: "${project.description}"
---

${project.content}`;
    
    fs.writeFileSync(`content/me/work/${project.slug}.md`, frontmatter);
  });
};
```

#### 2.2 Enhanced CMS Configuration
**File**: `static/admin/config.yml`
```yaml
backend:
  name: git-gateway
  branch: main

media_folder: "static/images/uploads"
public_folder: "/images/uploads"
publish_mode: editorial_workflow  # Enable draft/review workflow

collections:
  # Blog Posts
  - name: "blog"
    label: "Blog Posts"
    folder: "content/blog"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Date", name: "date", widget: "datetime"}
      - {label: "Draft", name: "draft", widget: "boolean", default: false}
      - {label: "Description", name: "description", widget: "string"}
      - {label: "Featured Image", name: "image", widget: "image", required: false}
      - {label: "Categories", name: "categories", widget: "list"}
      - {label: "Tags", name: "tags", widget: "list"}
      - {label: "Body", name: "body", widget: "markdown"}

  # Teaching Content
  - name: "sla-theory"
    label: "SLA Theory"
    folder: "content/teaching-learning/sla-theory"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Date", name: "date", widget: "datetime"}
      - {label: "Position", name: "position", widget: "string"}
      - {label: "Draft", name: "draft", widget: "boolean", default: false}
      - {label: "Description", name: "description", widget: "string"}
      - {label: "Key Theorists", name: "theorists", widget: "list"}
      - {label: "Body", name: "body", widget: "markdown"}

  # Tools & Strategies
  - name: "tools-built"
    label: "Tools Built"
    folder: "content/tools/built"
    create: true
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Description", name: "description", widget: "string"}
      - {label: "Tech Stack", name: "tech_stack", widget: "list"}
      - {label: "Demo URL", name: "demo_url", widget: "string", required: false}
      - {label: "GitHub URL", name: "github_url", widget: "string", required: false}
      - {label: "Body", name: "body", widget: "markdown"}

  # Poetry
  - name: "poetry"
    label: "Poetry"
    folder: "content/writing/poetry"
    create: true
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Date", name: "date", widget: "datetime"}
      - {label: "Language", name: "language", widget: "select", options: ["en", "es"]}
      - {label: "Categories", name: "categories", widget: "list"}
      - {label: "Body", name: "body", widget: "markdown"}

  # Pages
  - name: "pages"
    label: "Pages"
    files:
      - label: "Home Page"
        name: "home"
        file: "content/_index.md"
        fields:
          - {label: "Title", name: "title", widget: "string"}
          - {label: "Body", name: "body", widget: "markdown"}
      - label: "About Me"
        name: "about"
        file: "content/me/_index.md"
        fields:
          - {label: "Title", name: "title", widget: "string"}
          - {label: "Body", name: "body", widget: "markdown"}
      - label: "Services"
        name: "services" 
        file: "content/services/_index.md"
        fields:
          - {label: "Title", name: "title", widget: "string"}
          - {label: "Body", name: "body", widget: "markdown"}

  # Site Settings
  - name: "settings"
    label: "Site Settings"
    files:
      - label: "Site Config"
        name: "config"
        file: "config/_default/params.yaml"
        fields:
          - {label: "Site Title", name: "title", widget: "string"}
          - {label: "Description", name: "description", widget: "text"}
          - {label: "Author", name: "author", widget: "string"}
          - {label: "Email", name: "email", widget: "string"}
          - {label: "Social Links", name: "social", widget: "object", fields: [
              {label: "GitHub", name: "github", widget: "string", required: false},
              {label: "LinkedIn", name: "linkedin", widget: "string", required: false},
              {label: "Twitter", name: "twitter", widget: "string", required: false}
            ]}
```

#### 2.3 Media Management Setup
```bash
# Create organized upload structure
mkdir -p static/images/uploads/{blog,portfolio,general}
mkdir -p static/files/documents

# Add media processing
npm install sharp # For image optimization
```

### Phase 3: Advanced Features (Days 4-5) 🚀

#### 3.1 Custom Widgets & Preview
**File**: `static/admin/config.yml` (additions)
```yaml
# Custom editor components
editor:
  preview: true
  frame: true

# Custom widgets for better UX  
custom_widgets:
  - name: "tech-stack"
    label: "Technology Stack"
    widget: "list"
    allow_add: true
    fields:
      - {label: "Technology", name: "tech", widget: "string"}
      - {label: "Proficiency", name: "level", widget: "select", options: ["Beginner", "Intermediate", "Advanced", "Expert"]}

# Hugo shortcode support
shortcodes:
  - name: "youtube"
    label: "YouTube Video"
    widget: "string"
    hint: "YouTube video ID only"
  - name: "codepen" 
    label: "CodePen"
    widget: "string"
    hint: "CodePen URL"
```

#### 3.2 Workflow Integration
```yaml
# Enhanced workflow in config.yml
publish_mode: editorial_workflow
logo_url: "/images/logo.png"

# Slug configuration
slug:
  encoding: "ascii"
  clean_accents: true
  sanitize_replacement: "-"

# Collection view settings
display_url: https://vocal-pony-24e3de.netlify.app
```

#### 3.3 Internationalization Support
```yaml
# Multilingual collections
collections:
  - name: "blog-es"
    label: "Blog (Español)"
    folder: "content/es/blog"
    create: true
    fields:
      # Same fields as English blog
      
  - name: "pages-es"
    label: "Páginas"
    files:
      - label: "Inicio"
        name: "home-es"
        file: "content/es/_index.md"
        fields:
          - {label: "Título", name: "title", widget: "string"}
          - {label: "Contenido", name: "body", widget: "markdown"}
```

### Phase 4: Cleanup & Optimization (Days 6-7) 🧹

#### 4.1 Remove Supabase Components
```bash
# Script: scripts/cleanup-supabase.sh
#!/bin/bash

# Remove Supabase-related files
rm -rf supabase/
rm -rf netlify/functions/supabase-*
rm -rf netlify/functions/utils/supabase*
rm -rf scripts/*supabase*
rm -rf tests/supabase/

# Remove complex auth functions  
rm -rf netlify/functions/auth-*
rm -rf netlify/edge-functions/

# Remove admin dashboard complexity
rm -rf static/admin/js/
rm -rf static/admin/css/
rm -rf static/admin/*.html
# Keep only: config.yml, index.html

# Clean package.json
npm uninstall @supabase/supabase-js

# Update netlify.toml
# Remove all Supabase-related config
# Keep only essential redirects
```

#### 4.2 Simplified netlify.toml
```toml
[build]
  command = "npm run build:production"
  publish = "public"

[build.environment]
  HUGO_VERSION = "0.121.0"
  NODE_VERSION = "18"
  NODE_ENV = "production"

# CMS Admin
[[redirects]]
  from = "/admin/*"
  to = "/admin/index.html"
  status = 200

# Enable Identity
[[headers]]
  for = "/admin/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
```

#### 4.3 Performance Optimization
```bash
# Optimize images during build
npm install @netlify/plugin-lighthouse

# Add to netlify.toml
[[plugins]]
  package = "@netlify/plugin-lighthouse"
  
# Enable Git LFS for large media files
git lfs track "*.jpg" "*.png" "*.pdf" "*.mov"
```

## Data Migration Checklist

### Content to Preserve ✅
- [x] **Blog posts** (3 files) → Migrate to Decap CMS
- [x] **SLA theory content** (13 files) → Create dedicated collection
- [x] **Tools documentation** (15+ files) → Organize in tools collection  
- [x] **Poetry** (7 files) → Bilingual poetry collection
- [x] **Portfolio work** → Convert to markdown if needed
- [x] **Spanish translations** → Maintain multilingual structure
- [x] **Media files** → Move to organized structure

### Data to Export from Supabase (if exists)
```sql
-- Check if any dynamic content exists
SELECT COUNT(*) FROM blog_posts;
SELECT COUNT(*) FROM projects; 
SELECT COUNT(*) FROM contact_messages;

-- Export strategies:
-- 1. Blog posts → Convert to markdown in content/blog/
-- 2. Projects → Convert to markdown in content/me/work/  
-- 3. Contact messages → Export to CSV for records
-- 4. User data → Not needed (switching to Netlify Identity)
```

### Configuration Migration
- [x] **Hugo config** → Keep existing (working well)
- [x] **Netlify settings** → Simplify, remove Supabase vars
- [x] **Menu structure** → Preserve existing
- [x] **Permalinks** → Keep current structure
- [x] **Taxonomies** → Maintain categories/tags

## Implementation Timeline

### Day 1: Emergency Deployment 🚑
- **Morning**: Install Decap CMS, create basic config
- **Afternoon**: Enable Netlify Identity, deploy
- **Evening**: Test basic editing functionality
- **Success Metric**: Can edit blog posts via `/admin/`

### Day 2-3: Enhancement & Migration 🔄  
- **Day 2**: Enhanced collections, workflow setup
- **Day 3**: Data export/migration, media organization
- **Success Metric**: All content types editable

### Day 4-5: Advanced Features 🚀
- **Day 4**: Custom widgets, preview improvements
- **Day 5**: Multilingual support, workflow refinement
- **Success Metric**: Full editorial workflow functional

### Day 6-7: Cleanup & Launch 🧹
- **Day 6**: Remove Supabase components, simplify config
- **Day 7**: Performance optimization, final testing
- **Success Metric**: Clean, fast, maintainable CMS

## Risk Mitigation

### High Risk Items ⚠️
1. **Data Loss During Migration**
   - Mitigation: Full backup before starting
   - Rollback: Keep Supabase data read-only during transition

2. **Broken Links After Cleanup**
   - Mitigation: Comprehensive link audit
   - Testing: Automated link checking

3. **Authentication Issues**
   - Mitigation: Test Identity setup before removing Supabase auth
   - Fallback: Keep emergency admin access

### Medium Risk Items 📋
1. **Media File Organization**
   - Plan: Systematic reorganization with redirects
2. **Build Process Changes**  
   - Plan: Incremental updates with testing
3. **User Training**
   - Plan: Create simple documentation

## Success Criteria

### Phase 1 Success ✅
- [ ] CMS accessible at `/admin/`
- [ ] Can authenticate with Netlify Identity  
- [ ] Can edit existing content
- [ ] Hugo site builds without errors
- [ ] Content displays correctly on site

### Phase 2 Success ✅
- [ ] All content types have collections
- [ ] Editorial workflow functional
- [ ] Media management working
- [ ] Multilingual editing supported

### Phase 3 Success ✅
- [ ] Custom widgets operational
- [ ] Preview functionality working
- [ ] Advanced workflow features active

### Phase 4 Success ✅
- [ ] All Supabase components removed
- [ ] Clean, minimal configuration
- [ ] Performance optimized
- [ ] Documentation complete

## Rollback Plan 🔙

If migration fails at any stage:

1. **Immediate Rollback**: 
   ```bash
   git revert [last-working-commit]
   git push origin main --force
   ```

2. **Restore Supabase**: Re-enable environment variables

3. **Fallback CMS**: Emergency static admin panel

4. **Data Recovery**: Restore from backup

## Long-term Benefits

### Immediate Improvements ✨
- **Reliability**: Git-based, no database dependencies
- **Simplicity**: One tool vs. 25+ functions
- **Performance**: Static generation, faster builds
- **Security**: Reduced attack surface
- **Cost**: Eliminate Supabase subscription

### Long-term Advantages 🚀
- **Maintainability**: Simple, standard workflow
- **Scalability**: Hugo's static generation
- **Portability**: Not vendor-locked to Supabase
- **Collaboration**: Git-based workflow for content
- **Backup**: Content in version control

## Post-Migration Tasks

### Week 1: Stabilization
- [ ] Monitor error rates
- [ ] User acceptance testing  
- [ ] Performance verification
- [ ] Backup validation

### Week 2: Enhancement
- [ ] User training materials
- [ ] Workflow documentation
- [ ] Advanced feature exploration
- [ ] Community feedback integration

### Month 1: Optimization
- [ ] Content workflow refinement
- [ ] Performance monitoring
- [ ] User feedback integration
- [ ] Feature roadmap planning

## Conclusion

This migration plan provides a clear path from the current broken Supabase-based CMS to a reliable, maintainable Decap CMS solution. The phased approach ensures minimal downtime while providing immediate relief and long-term benefits.

**Key Advantages of New System:**
- ✅ **Working CMS** within 24 hours
- ✅ **Git-based workflow** for reliability
- ✅ **Simplified architecture** for maintainability  
- ✅ **Cost reduction** by eliminating Supabase
- ✅ **Improved performance** with static generation
- ✅ **Better security** with reduced complexity

**Next Steps:**
1. Execute Phase 1 immediately for working CMS
2. Proceed with systematic migration over following days
3. Monitor and optimize post-migration

---

**Migration Lead**: System Architecture Team  
**Review Date**: 2025-08-25  
**Approval Status**: Ready for Implementation  
**Priority**: HIGH - System Currently Broken