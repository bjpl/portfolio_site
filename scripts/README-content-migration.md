# Hugo to Supabase Content Migration

This directory contains scripts to migrate Hugo content from markdown files and JSON data to your Supabase database.

## 📋 Overview

The migration system handles three types of content:

- **Blog Posts** (`content/blog/*.md`) → `blog_posts` table
- **Poetry** (`content/writing/poetry/*.md`) → `blog_posts` table (with `type='poetry'`)  
- **Projects** (`data/projects.json`) → `projects` table

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Set Supabase credentials
export SUPABASE_URL="your-supabase-project-url"
export SUPABASE_ANON_KEY="your-supabase-anon-key"

# Or create a .env file in the project root:
echo "SUPABASE_URL=your-url" >> .env
echo "SUPABASE_ANON_KEY=your-key" >> .env
```

### 2. Install Dependencies

```bash
cd scripts
npm install
```

### 3. Check Setup

```bash
# Validate environment and content
node setup-migration.js
```

### 4. Run Migration

```bash
# ALWAYS start with a dry run
node migrate-content.js --dry-run

# If dry run looks good, run the actual migration
node migrate-content.js
```

## 📖 Script Usage

### Main Migration Script

```bash
# Basic usage
node migrate-content.js [options]

# Options:
--dry-run                    # Test run (no database changes)
--content-type=TYPE          # Migrate specific type (blog|poetry|projects|all)
--help                       # Show help message
```

### Examples

```bash
# Test migration of all content
node migrate-content.js --dry-run

# Migrate only blog posts (dry run)
node migrate-content.js --dry-run --content-type=blog

# Migrate only projects (live)
node migrate-content.js --content-type=projects

# Full live migration
node migrate-content.js
```

### NPM Scripts

From the `scripts/` directory:

```bash
# Quick commands
npm run migrate:content:dry-run     # Dry run all content
npm run migrate:content             # Live migration all content
npm run migrate:content:blog        # Migrate only blog posts
npm run migrate:content:poetry      # Migrate only poetry
npm run migrate:content:projects    # Migrate only projects
```

## 📊 Content Processing Details

### Blog Posts (`content/blog/*.md`)

**Source:** Hugo markdown files with YAML frontmatter
**Target:** `blog_posts` table

**Processed Fields:**
- `title` → `title`
- `slug` (generated from title) → `slug`
- Markdown content → `content`
- `description` → `excerpt`
- `draft: false` → `status: 'published'`
- `tags` → `tags` array
- `categories` → `categories` array
- `date` → `published_at`
- Auto-calculated `reading_time`

**Example:**
```yaml
---
title: "My Blog Post"
date: 2025-01-17
draft: false
tags: ["AI", "Technology"]
categories: ["Tech Articles"]
description: "A great blog post about AI"
---

Content goes here...
```

### Poetry (`content/writing/poetry/*.md`)

**Source:** Hugo markdown files with YAML frontmatter
**Target:** `blog_posts` table with `type='poetry'`

**Special Features:**
- Detects bilingual content (looks for `poem-translation` class)
- Preserves HTML structure for poetry formatting
- Language detection from frontmatter
- Minimum 1-minute reading time

**Example:**
```yaml
---
title: "My Poem / Mi Poema"
date: 2025-08-18T02:00:00Z
language: "es"
categories: ["poetry", "bilingual"]
---

<div class="poem-original">
Spanish poem...
</div>

<div class="poem-translation">
English translation...
</div>
```

### Projects (`data/projects.json`)

**Source:** JSON file with structured project data
**Target:** `projects` table

**Rich Data Processing:**
- Maps project types to database enums
- Combines features and challenges into formatted content
- Handles multiple URLs (demo, live, GitHub)
- Preserves gallery images and metadata
- Status mapping: "Completed" → "published", others → "draft"

**Example JSON:**
```json
{
  "projects": [
    {
      "id": "my-project",
      "title": "My Project",
      "description": "Short description",
      "longDescription": "Detailed description",
      "technologies": ["React", "Node.js"],
      "type": "Web Development",
      "status": "Completed",
      "featured": true,
      "features": ["Feature 1", "Feature 2"],
      "challenges": ["Challenge 1", "Challenge 2"],
      "demo": "https://demo.com",
      "github": "https://github.com/user/repo"
    }
  ]
}
```

## 🗄️ Database Schema Requirements

Ensure your Supabase database has the following tables with required fields:

### `blog_posts` Table
```sql
- id (UUID, Primary Key)
- title (TEXT)
- slug (TEXT, UNIQUE)
- content (TEXT)
- excerpt (TEXT)  
- status (TEXT) -- 'draft', 'published', 'archived'
- tags (TEXT[])
- categories (TEXT[])
- reading_time (INTEGER)
- seo_title (TEXT)
- seo_description (TEXT)
- seo_keywords (TEXT[])
- published_at (TIMESTAMPTZ)
- metadata (JSONB)
- user_id (UUID) -- Will be NULL after migration
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### `projects` Table  
```sql
- id (UUID, Primary Key)
- title (TEXT)
- slug (TEXT, UNIQUE)
- description (TEXT)
- content (TEXT)
- short_description (TEXT)
- status (TEXT) -- 'draft', 'published', 'archived'
- technologies (TEXT[])
- project_type (TEXT) -- 'web', 'mobile', 'desktop', 'api', 'library', 'other'
- demo_url (TEXT)
- live_url (TEXT)  
- github_url (TEXT)
- featured (BOOLEAN)
- sort_order (INTEGER)
- seo_title (TEXT)
- seo_description (TEXT)
- metadata (JSONB)
- user_id (UUID) -- Will be NULL after migration
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## ⚙️ Configuration

### Environment Variables

The script looks for Supabase credentials in this order:

1. `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. `.env` file in project root
4. `scripts/.env` file

### Content Structure Expected

```
portfolio_site/
├── content/
│   ├── blog/
│   │   ├── post1.md
│   │   ├── post2.md
│   │   └── _index.md (ignored)
│   └── writing/
│       └── poetry/
│           ├── poem1.md
│           ├── poem2.md
│           └── _index.md (ignored)
├── data/
│   └── projects.json
└── scripts/
    ├── migrate-content.js
    └── setup-migration.js
```

## 🛠️ Troubleshooting

### Common Issues

**❌ "Supabase credentials not found"**
- Check environment variables are set
- For dry runs, this is not needed
- Verify `.env` file exists and is loaded

**❌ "Cannot access content directory"**
- Ensure you're running from the project root
- Check that content directories exist
- Verify file permissions

**❌ "Blog posts table doesn't exist"**
- Run your database migrations first
- Check Supabase dashboard for table structure
- Verify RLS policies allow inserts

### Debug Tips

1. **Always start with `--dry-run`** to test processing
2. **Use `--content-type=blog`** to test one type at a time
3. **Check the setup script** first: `node setup-migration.js`
4. **Look at the migration summary** for detailed error information

### Migration Summary

After running, you'll see a detailed summary:

```
📊 MIGRATION SUMMARY
============================
📰 Blog Posts: 3 successful, 0 errors
🎭 Poetry: 7 successful, 0 errors  
🚀 Projects: 6 successful, 0 errors

📈 Total: 16 successful, 0 errors
```

Any errors will be listed with specific details about what failed.

## 🔒 Post-Migration Tasks

After successful migration, you'll need to:

1. **Set User IDs:** Update `user_id` fields to associate content with actual users
2. **Upload Media:** Migrate any referenced images to Supabase Storage  
3. **Update URLs:** Convert Hugo-style URLs to your new system
4. **Test Content:** Verify all content displays correctly in your application
5. **SEO Check:** Ensure meta fields are properly populated

### Example User ID Update

```sql
-- Update all blog posts to a specific user
UPDATE blog_posts 
SET user_id = 'your-user-uuid-here' 
WHERE user_id IS NULL;

-- Update all projects to a specific user  
UPDATE projects
SET user_id = 'your-user-uuid-here'
WHERE user_id IS NULL;
```

## 📝 Content Mapping Reference

| Hugo Source | Database Table | Special Notes |
|-------------|---------------|---------------|
| `content/blog/*.md` | `blog_posts` | Standard blog posts |
| `content/writing/poetry/*.md` | `blog_posts` | `type='poetry'` in metadata |
| `data/projects.json` | `projects` | Rich content formatting |
| Frontmatter `tags` | Array fields | Preserved as arrays |
| Frontmatter `categories` | Array fields | Preserved as arrays |
| Markdown content | `content` field | Raw markdown preserved |
| `draft: false` | `status: 'published'` | Status mapping |
| Project features | Formatted content | Added to description |

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `node setup-migration.js` for environment validation
3. Use `--dry-run` mode to test without database changes
4. Check the migration summary for specific error details

The migration preserves all original data in the `metadata` JSONB field, so you can always recover original information if needed.