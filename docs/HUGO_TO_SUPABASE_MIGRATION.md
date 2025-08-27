# Hugo to Supabase Content Migration Plan

## Executive Summary

This document outlines a comprehensive migration strategy to move all Hugo static content to Supabase, enabling dynamic content management, real-time capabilities, and enhanced user experience while preserving SEO and existing URL structures.

## Current Hugo Content Analysis

### Content Structure Discovered

```
content/
├── blog/ (3 posts)
│   ├── ai-language-learning-revolution.md
│   ├── scaling-education-800k-learners.md
│   └── vr-language-immersion.md
├── me/work/ (Portfolio projects)
│   └── portfolio-case-study.md
├── tools/ (Educational tools)
│   ├── built/ (6 tools)
│   ├── strategies/ (8 strategies)
│   └── what-i-use/ (10 tools)
├── writing/poetry/ (7 poems)
├── teaching-learning/
│   ├── sla-theory/ (13 academic papers)
│   └── about-me.md
├── photography/ (Portfolio)
└── es/ (Spanish translations)
    ├── All major sections translated
    └── Localized content structure
```

### Metadata Patterns Identified

**Blog Posts:**
- title, date, draft, tags[], categories[], description, author
- Rich content with markdown formatting
- SEO metadata (meta_title, meta_description)
- Social sharing data

**Portfolio/Tools:**
- title, date, draft, description
- Technical specifications (tech_stack, repository links)
- Project categorization and tagging

**Poetry/Creative Writing:**
- Bilingual content (EN/ES)
- Creative formatting with HTML elements
- Category and tag taxonomy
- Date-based organization

**Academic Content:**
- Structured theoretical content
- Cross-references and citations
- Hierarchical organization

## Enhanced Supabase Schema Design

### Core Content Tables

```sql
-- Enhanced blog posts with Hugo compatibility
CREATE TABLE hugo_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  hugo_path TEXT NOT NULL, -- Original Hugo file path
  frontmatter JSONB, -- Complete frontmatter preservation
  
  -- Hugo-specific fields
  date TIMESTAMPTZ NOT NULL,
  draft BOOLEAN DEFAULT false,
  weight INTEGER,
  layout TEXT,
  type TEXT DEFAULT 'post',
  
  -- Metadata
  author TEXT DEFAULT 'Brandon JP Lambert',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  featured_image TEXT,
  
  -- Multilingual
  language TEXT DEFAULT 'en',
  translations JSONB DEFAULT '{}',
  
  -- Analytics
  reading_time INTEGER,
  word_count INTEGER,
  view_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'published',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio projects with Hugo compatibility
CREATE TABLE hugo_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  hugo_path TEXT NOT NULL,
  frontmatter JSONB,
  
  -- Project-specific
  tech_stack TEXT[] DEFAULT '{}',
  github_url TEXT,
  live_url TEXT,
  demo_url TEXT,
  repository_url TEXT,
  
  -- Portfolio categorization
  project_type TEXT, -- 'tool', 'strategy', 'built', etc.
  difficulty_level INTEGER,
  featured BOOLEAN DEFAULT false,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  
  -- Status
  status TEXT DEFAULT 'active',
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic/Teaching content
CREATE TABLE hugo_academic_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  hugo_path TEXT NOT NULL,
  frontmatter JSONB,
  
  -- Academic fields
  theory_category TEXT, -- 'sla-theory', 'pedagogy', etc.
  academic_level TEXT,
  citations JSONB DEFAULT '[]',
  references JSONB DEFAULT '[]',
  
  -- Organization
  parent_topic TEXT,
  related_topics TEXT[] DEFAULT '{}',
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creative writing (poetry, etc.)
CREATE TABLE hugo_creative_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  hugo_path TEXT NOT NULL,
  frontmatter JSONB,
  
  -- Creative fields
  work_type TEXT NOT NULL, -- 'poetry', 'prose', etc.
  original_language TEXT DEFAULT 'en',
  translation TEXT, -- If bilingual
  style_notes TEXT,
  
  -- Categorization
  themes TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  mood TEXT,
  
  -- Publishing
  date TIMESTAMPTZ,
  featured BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- URL mappings for SEO preservation
CREATE TABLE hugo_url_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hugo_path TEXT NOT NULL,
  hugo_url TEXT NOT NULL,
  supabase_table TEXT NOT NULL,
  supabase_id UUID NOT NULL,
  redirect_type INTEGER DEFAULT 301,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media assets migration tracking
CREATE TABLE hugo_media_migration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_path TEXT NOT NULL,
  hugo_url TEXT NOT NULL,
  supabase_url TEXT,
  migration_status TEXT DEFAULT 'pending',
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Migration Scripts Architecture

### 1. Content Parser (`scripts/hugo-content-parser.js`)

```javascript
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { createClient } = require('@supabase/supabase-js');

class HugoContentParser {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    this.contentDir = './content';
    this.stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0
    };
  }

  async migrateAll() {
    console.log('🚀 Starting Hugo to Supabase migration...');
    
    await this.migrateBlogPosts();
    await this.migratePortfolioProjects();
    await this.migrateAcademicContent();
    await this.migrateCreativeWorks();
    await this.migrateSpanishContent();
    await this.createUrlMappings();
    
    this.printMigrationSummary();
  }

  async migrateBlogPosts() {
    const blogDir = path.join(this.contentDir, 'blog');
    const files = this.getMarkdownFiles(blogDir);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        
        const post = {
          title: frontmatter.title,
          slug: this.generateSlug(frontmatter.title),
          content: body,
          hugo_path: path.relative(this.contentDir, file),
          frontmatter: frontmatter,
          date: new Date(frontmatter.date),
          draft: frontmatter.draft || false,
          author: frontmatter.author || 'Brandon JP Lambert',
          description: frontmatter.description,
          tags: frontmatter.tags || [],
          categories: frontmatter.categories || [],
          reading_time: this.calculateReadingTime(body),
          word_count: this.countWords(body),
          published_at: frontmatter.draft ? null : new Date(frontmatter.date)
        };

        await this.supabase.from('hugo_posts').insert(post);
        this.stats.succeeded++;
        console.log(`✅ Migrated blog post: ${post.title}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${file}:`, error.message);
        this.stats.failed++;
      }
      
      this.stats.processed++;
    }
  }
}
```

### 2. Media Migration (`scripts/hugo-media-migrator.js`)

```javascript
class HugoMediaMigrator {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    this.staticDir = './static';
    this.bucket = 'portfolio-media';
  }

  async migrateAllMedia() {
    const mediaFiles = this.findMediaFiles();
    
    for (const file of mediaFiles) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const fileName = this.generateUniqueFileName(file.name);
        
        // Upload to Supabase Storage
        const { data, error } = await this.supabase.storage
          .from(this.bucket)
          .upload(fileName, fileBuffer, {
            contentType: file.mimeType,
            cacheControl: '3600'
          });

        if (error) throw error;

        // Record migration in database
        await this.supabase.from('hugo_media_migration').insert({
          original_path: file.path,
          hugo_url: file.hugoUrl,
          supabase_url: data.path,
          migration_status: 'completed',
          file_size: fileBuffer.length,
          mime_type: file.mimeType
        });

        console.log(`✅ Migrated media: ${file.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate media ${file.name}:`, error.message);
      }
    }
  }
}
```

### 3. URL Preservation (`scripts/hugo-url-mapper.js`)

```javascript
class HugoUrlMapper {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    this.hugoConfig = this.loadHugoConfig();
  }

  async createUrlMappings() {
    // Map blog posts
    const { data: posts } = await this.supabase.from('hugo_posts').select('*');
    for (const post of posts) {
      const hugoUrl = this.generateHugoUrl('blog', post.slug, post.date);
      const supabaseUrl = `/blog/${post.slug}`;
      
      await this.createMapping(post.hugo_path, hugoUrl, 'hugo_posts', post.id);
    }

    // Map portfolio projects
    const { data: projects } = await this.supabase.from('hugo_projects').select('*');
    for (const project of projects) {
      const hugoUrl = this.generateHugoUrl(project.project_type, project.slug);
      const supabaseUrl = `/projects/${project.slug}`;
      
      await this.createMapping(project.hugo_path, hugoUrl, 'hugo_projects', project.id);
    }
  }

  generateHugoUrl(section, slug, date = null) {
    // Implement Hugo URL generation logic based on config
    // This preserves exact Hugo URLs for SEO
    return date ? 
      `/${section}/${date.getFullYear()}/${slug}/` : 
      `/${section}/${slug}/`;
  }
}
```

## Migration Benefits

### Immediate Benefits

1. **Dynamic Content Management**
   - Real-time content updates without rebuilds
   - Multi-user content editing capabilities
   - Version control and revision history
   - Scheduled publishing

2. **Enhanced User Experience**
   - Real-time search across all content
   - User comments and engagement
   - Content recommendations
   - Personalization capabilities

3. **SEO Advantages**
   - Preserved URL structure
   - Improved page load times
   - Better crawlability
   - Enhanced meta data management

### Long-term Benefits

1. **Scalability**
   - Handle thousands of posts without rebuild times
   - Real-time analytics and insights
   - A/B testing capabilities
   - Content performance tracking

2. **Integration Capabilities**
   - Third-party service integration
   - Webhook-based automation
   - API-first architecture
   - Headless CMS capabilities

3. **Maintenance Reduction**
   - No more build/deploy cycles for content
   - Automated backups and versioning
   - Real-time collaboration
   - Content validation and quality checks

## Implementation Strategy

### Phase 1: Schema Setup (Week 1)
- Deploy enhanced Supabase schema
- Set up storage buckets
- Configure RLS policies
- Test data structures

### Phase 2: Content Migration (Week 2)
- Run migration scripts
- Validate data integrity
- Test URL mappings
- Verify media assets

### Phase 3: Frontend Integration (Week 3)
- Update Hugo templates to query Supabase
- Implement fallback mechanisms
- Test search functionality
- Validate SEO preservation

### Phase 4: Go-Live & Monitoring (Week 4)
- Deploy to production
- Monitor performance
- Validate analytics
- Document processes

## Quality Assurance Checklist

- [ ] All Hugo content successfully migrated
- [ ] URL structure preserved (301 redirects working)
- [ ] SEO metadata maintained
- [ ] Multilingual content properly handled
- [ ] Media assets accessible
- [ ] Search functionality working
- [ ] Performance meets requirements
- [ ] RLS policies secure
- [ ] Backup procedures in place
- [ ] Documentation complete

## Risk Mitigation

1. **Data Loss Prevention**
   - Complete Hugo backup before migration
   - Incremental migration with rollback capability
   - Comprehensive testing environment

2. **SEO Protection**
   - URL mapping preservation
   - Meta data validation
   - Redirect testing
   - Search engine notification

3. **Performance Assurance**
   - Database indexing optimization
   - Caching strategy implementation
   - CDN configuration
   - Load testing

## Success Metrics

- Migration completion: 100% of content successfully migrated
- SEO preservation: 0% loss in search rankings
- Performance improvement: <2s page load times
- User engagement: Measurable increase in time on site
- Content management efficiency: 75% reduction in publishing time

## Next Steps

1. Review and approve migration plan
2. Set up development/staging Supabase instance
3. Execute Phase 1 schema deployment
4. Begin incremental content migration testing
5. Prepare frontend integration strategy

---

*Migration planned and documented by Backend API Developer Agent*
*Ready for npx claude-flow@alpha hooks post-task --task-id "content-migration"*