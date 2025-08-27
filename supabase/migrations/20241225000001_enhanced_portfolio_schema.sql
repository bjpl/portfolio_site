-- =====================================================
-- Enhanced Portfolio Site - Comprehensive Database Schema
-- Migration: 20241225000001_enhanced_portfolio_schema.sql
-- This migration adds enhanced tables and features to the existing base schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- ENHANCED TABLES AND NEW FEATURES
-- =====================================================

-- First, add missing core tables that are referenced
-- Site settings table for configuration management
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
  category TEXT DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content versions table for version tracking
CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'project', 'page')),
  content_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  change_summary TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_id, version_number)
);

-- Pages table for static content management
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  template TEXT DEFAULT 'default',
  parent_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'scheduled')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'password')),
  password_hash TEXT,
  featured_image TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  custom_css TEXT,
  custom_js TEXT,
  canonical_url TEXT,
  redirect_url TEXT,
  language TEXT DEFAULT 'en',
  translations JSONB DEFAULT '{}',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_homepage BOOLEAN DEFAULT false,
  is_in_menu BOOLEAN DEFAULT true,
  menu_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced categories table with hierarchical support
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  featured_image TEXT,
  post_count INTEGER DEFAULT 0,
  project_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow states table for content management
CREATE TABLE IF NOT EXISTS public.workflow_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  icon TEXT DEFAULT 'circle',
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'project', 'page')),
  is_initial BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  transitions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content workflow tracking
CREATE TABLE IF NOT EXISTS public.content_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'project', 'page')),
  content_id UUID NOT NULL,
  workflow_state_id UUID REFERENCES public.workflow_states(id),
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced roles and permissions system
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, role_id)
);

-- Advanced media collections
CREATE TABLE IF NOT EXISTS public.media_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'gallery' CHECK (type IN ('gallery', 'album', 'slideshow')),
  featured_image TEXT,
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media collection items
CREATE TABLE IF NOT EXISTS public.media_collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID REFERENCES public.media_collections(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  caption TEXT,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content blocks for flexible page building
CREATE TABLE IF NOT EXISTS public.content_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_type TEXT NOT NULL CHECK (parent_type IN ('page', 'blog_post', 'project')),
  parent_id UUID NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'video', 'gallery', 'code', 'quote', 'table', 'embed')),
  content JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEO and meta data management
CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page', 'blog_post', 'project', 'category')),
  entity_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT[],
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  og_type TEXT DEFAULT 'website',
  twitter_card TEXT DEFAULT 'summary',
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  schema_markup JSONB,
  robots TEXT DEFAULT 'index,follow',
  custom_meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

-- Form submissions and custom forms
CREATE TABLE IF NOT EXISTS public.form_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  notification_emails TEXT[],
  success_message TEXT,
  redirect_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES public.form_definitions(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'processed', 'archived')),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  submitted_by UUID REFERENCES public.profiles(id),
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu system for navigation
CREATE TABLE IF NOT EXISTS public.menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID REFERENCES public.menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  target TEXT DEFAULT '_self',
  css_class TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advanced analytics tables
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  visitor_id TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  bounce BOOLEAN DEFAULT true
);

-- Page performance metrics
CREATE TABLE IF NOT EXISTS public.page_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_url TEXT NOT NULL,
  session_id UUID REFERENCES public.analytics_sessions(id),
  load_time INTEGER,
  first_contentful_paint INTEGER,
  largest_contentful_paint INTEGER,
  cumulative_layout_shift DECIMAL(5,3),
  first_input_delay INTEGER,
  time_to_interactive INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Pages indexes
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON public.pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_author_id ON public.pages(author_id);
CREATE INDEX IF NOT EXISTS idx_pages_published_at ON public.pages(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_language ON public.pages(language);
CREATE INDEX IF NOT EXISTS idx_pages_fts ON public.pages USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(excerpt, '')));

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflow_states_content_type ON public.workflow_states(content_type);
CREATE INDEX IF NOT EXISTS idx_content_workflows_content ON public.content_workflows(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_workflows_state ON public.content_workflows(workflow_state_id);
CREATE INDEX IF NOT EXISTS idx_content_workflows_assigned ON public.content_workflows(assigned_to);

-- Media collection indexes
CREATE INDEX IF NOT EXISTS idx_media_collections_slug ON public.media_collections(slug);
CREATE INDEX IF NOT EXISTS idx_media_collections_type ON public.media_collections(type);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_collection ON public.media_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_media ON public.media_collection_items(media_asset_id);

-- Content blocks indexes
CREATE INDEX IF NOT EXISTS idx_content_blocks_parent ON public.content_blocks(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_type ON public.content_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_content_blocks_sort ON public.content_blocks(sort_order);

-- SEO indexes
CREATE INDEX IF NOT EXISTS idx_seo_metadata_entity ON public.seo_metadata(entity_type, entity_id);

-- Forms indexes
CREATE INDEX IF NOT EXISTS idx_form_definitions_slug ON public.form_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON public.form_submissions(created_at DESC);

-- Menu indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON public.menu_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON public.menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON public.menu_items(sort_order);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON public.analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON public.analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON public.analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_performance_page_url ON public.page_performance(page_url);
CREATE INDEX IF NOT EXISTS idx_page_performance_session_id ON public.page_performance(session_id);

-- =====================================================
-- ADVANCED FUNCTIONS FOR CONTENT MANAGEMENT
-- =====================================================

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_slug TEXT, table_name TEXT, exclude_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  unique_slug TEXT;
  counter INTEGER := 0;
  slug_exists BOOLEAN;
BEGIN
  unique_slug := base_slug;
  
  LOOP
    -- Check if slug exists in the specified table
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE slug = $1 AND ($2 IS NULL OR id != $2))', table_name)
    INTO slug_exists
    USING unique_slug, exclude_id;
    
    EXIT WHEN NOT slug_exists;
    
    counter := counter + 1;
    unique_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN unique_slug;
END;
$$;

-- Function to update category counts
CREATE OR REPLACE FUNCTION public.update_category_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update post counts for categories - use tags field from existing schema
  UPDATE public.categories SET post_count = (
    SELECT COUNT(*)
    FROM public.blog_posts bp
    WHERE bp.tags && ARRAY[categories.name]
    AND bp.status = 'published'
  );
  
  -- Update project counts for categories - projects don't have category field in base schema
  -- This will be updated when projects are enhanced
  UPDATE public.categories SET project_count = 0;
  
  RETURN NULL;
END;
$$;

-- Function for content versioning
CREATE OR REPLACE FUNCTION public.create_content_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  version_num INTEGER;
  content_type TEXT;
BEGIN
  -- Determine content type based on table
  CASE TG_TABLE_NAME
    WHEN 'blog_posts' THEN content_type := 'blog_post';
    WHEN 'projects' THEN content_type := 'project';
    WHEN 'pages' THEN content_type := 'page';
    ELSE RETURN NEW;
  END CASE;
  
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO version_num
  FROM public.content_versions
  WHERE content_type = content_type AND content_id = NEW.id;
  
  -- Create version record
  INSERT INTO public.content_versions (
    content_type,
    content_id,
    version_number,
    title,
    content,
    metadata,
    change_summary,
    created_by
  ) VALUES (
    content_type,
    NEW.id,
    version_num,
    NEW.title,
    NEW.content,
    jsonb_build_object(
      'status', COALESCE(NEW.status, ''),
      'updated_at', NEW.updated_at
    ),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Initial version'
      ELSE 'Content updated'
    END,
    COALESCE(NEW.author_id, auth.uid())
  );
  
  RETURN NEW;
END;
$$;

-- Function to handle workflow transitions
CREATE OR REPLACE FUNCTION public.transition_workflow(
  content_type TEXT,
  content_id UUID,
  new_state_id UUID,
  notes TEXT DEFAULT NULL,
  assigned_to UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_workflow RECORD;
  target_state RECORD;
BEGIN
  -- Get current workflow
  SELECT * INTO current_workflow
  FROM public.content_workflows
  WHERE content_workflows.content_type = transition_workflow.content_type
  AND content_workflows.content_id = transition_workflow.content_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get target state
  SELECT * INTO target_state
  FROM public.workflow_states
  WHERE id = new_state_id;
  
  -- Check if transition is allowed (simplified check)
  IF target_state IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Create new workflow record
  INSERT INTO public.content_workflows (
    content_type,
    content_id,
    workflow_state_id,
    assigned_to,
    notes,
    created_by
  ) VALUES (
    transition_workflow.content_type,
    transition_workflow.content_id,
    new_state_id,
    transition_workflow.assigned_to,
    transition_workflow.notes,
    auth.uid()
  );
  
  RETURN TRUE;
END;
$$;

-- Function for advanced search
CREATE OR REPLACE FUNCTION public.advanced_search(
  query TEXT,
  content_types TEXT[] DEFAULT ARRAY['blog_post', 'project', 'page'],
  limit_results INTEGER DEFAULT 20
)
RETURNS TABLE(
  content_type TEXT,
  id UUID,
  title TEXT,
  excerpt TEXT,
  url_slug TEXT,
  relevance REAL,
  published_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'blog_post'::TEXT as content_type,
    bp.id,
    bp.title,
    bp.excerpt,
    bp.slug as url_slug,
    ts_rank_cd(to_tsvector('english', bp.title || ' ' || COALESCE(bp.content, '') || ' ' || COALESCE(bp.excerpt, '')), plainto_tsquery('english', query)) as relevance,
    bp.published_at
  FROM public.blog_posts bp
  WHERE 'blog_post' = ANY(content_types)
    AND bp.status = 'published'
    AND to_tsvector('english', bp.title || ' ' || COALESCE(bp.content, '') || ' ' || COALESCE(bp.excerpt, '')) @@ plainto_tsquery('english', query)
  
  UNION ALL
  
  SELECT 
    'project'::TEXT as content_type,
    p.id,
    p.title,
    p.short_description as excerpt,
    LOWER(REPLACE(p.title, ' ', '-')) as url_slug,
    ts_rank_cd(to_tsvector('english', p.title || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.short_description, '')), plainto_tsquery('english', query)) as relevance,
    p.created_at as published_at
  FROM public.projects p
  WHERE 'project' = ANY(content_types)
    AND p.status = 'published'
    AND to_tsvector('english', p.title || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('english', query)
    
  UNION ALL
  
  SELECT 
    'page'::TEXT as content_type,
    pg.id,
    pg.title,
    pg.excerpt,
    pg.slug as url_slug,
    ts_rank_cd(to_tsvector('english', pg.title || ' ' || COALESCE(pg.content, '') || ' ' || COALESCE(pg.excerpt, '')), plainto_tsquery('english', query)) as relevance,
    pg.published_at
  FROM public.pages pg
  WHERE 'page' = ANY(content_types)
    AND pg.status = 'published'
    AND pg.visibility = 'public'
    AND to_tsvector('english', pg.title || ' ' || COALESCE(pg.content, '') || ' ' || COALESCE(pg.excerpt, '')) @@ plainto_tsquery('english', query)
  
  ORDER BY relevance DESC
  LIMIT limit_results;
END;
$$;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Triggers for updated_at timestamps (using existing function from base schema)
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_states_updated_at
  BEFORE UPDATE ON public.workflow_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_workflows_updated_at
  BEFORE UPDATE ON public.content_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_collections_updated_at
  BEFORE UPDATE ON public.media_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at
  BEFORE UPDATE ON public.content_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_metadata_updated_at
  BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_definitions_updated_at
  BEFORE UPDATE ON public.form_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers for content versioning
CREATE TRIGGER create_blog_post_version
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.create_content_version();

CREATE TRIGGER create_project_version
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_content_version();

CREATE TRIGGER create_page_version
  AFTER INSERT OR UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.create_content_version();

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default workflow states
INSERT INTO public.workflow_states (name, slug, description, content_type, is_initial, color, icon) VALUES
('Draft', 'draft', 'Content is being written or edited', 'blog_post', true, '#6b7280', 'edit'),
('Under Review', 'under-review', 'Content is ready for review', 'blog_post', false, '#f59e0b', 'eye'),
('Published', 'published', 'Content is live and publicly available', 'blog_post', false, '#10b981', 'check'),
('Archived', 'archived', 'Content is no longer active', 'blog_post', false, '#ef4444', 'archive'),

('Planning', 'planning', 'Project is in planning phase', 'project', true, '#6b7280', 'clipboard'),
('In Progress', 'in-progress', 'Project is actively being worked on', 'project', false, '#f59e0b', 'play'),
('Completed', 'completed', 'Project is finished', 'project', false, '#10b981', 'check'),
('On Hold', 'on-hold', 'Project is temporarily paused', 'project', false, '#8b5cf6', 'pause'),

('Draft', 'page-draft', 'Page is being created or edited', 'page', true, '#6b7280', 'edit'),
('Published', 'page-published', 'Page is live', 'page', false, '#10b981', 'check'),
('Archived', 'page-archived', 'Page is no longer available', 'page', false, '#ef4444', 'archive')
ON CONFLICT (slug) DO NOTHING;

-- Insert default roles
INSERT INTO public.roles (name, description, permissions, is_system) VALUES
('Admin', 'Full system access', '{"all": true}', true),
('Editor', 'Content creation and management', '{"content": {"create": true, "read": true, "update": true, "delete": true}, "media": {"upload": true, "manage": true}}', true),
('Author', 'Content creation only', '{"content": {"create": true, "read": true, "update": "own"}, "media": {"upload": true, "manage": "own"}}', true),
('Viewer', 'Read-only access', '{"content": {"read": true}}', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default menus
INSERT INTO public.menus (name, location, description) VALUES
('Main Navigation', 'header', 'Primary site navigation'),
('Footer Links', 'footer', 'Footer navigation links'),
('Admin Menu', 'admin', 'Administrative interface navigation')
ON CONFLICT (name, location) DO NOTHING;

-- Insert default form definition (contact form)
INSERT INTO public.form_definitions (name, slug, description, fields, notification_emails) VALUES
('Contact Form', 'contact', 'Main contact form for the website', 
'[
  {"name": "name", "type": "text", "label": "Full Name", "required": true},
  {"name": "email", "type": "email", "label": "Email Address", "required": true},
  {"name": "subject", "type": "text", "label": "Subject", "required": false},
  {"name": "message", "type": "textarea", "label": "Message", "required": true},
  {"name": "company", "type": "text", "label": "Company", "required": false}
]'::jsonb,
ARRAY['admin@example.com']
) ON CONFLICT (slug) DO NOTHING;

-- Insert default site settings
INSERT INTO public.site_settings (key, value, type, category, description, is_public) VALUES
  ('site_title', 'Brandon JP Lambert - Portfolio', 'string', 'general', 'Site title', true),
  ('site_description', 'Personal portfolio and blog', 'string', 'general', 'Site description', true),
  ('admin_email', 'admin@example.com', 'string', 'general', 'Administrator email', false),
  ('posts_per_page', '10', 'number', 'content', 'Number of posts per page', false),
  ('enable_comments', 'true', 'boolean', 'content', 'Enable blog comments', true),
  ('maintenance_mode', 'false', 'boolean', 'general', 'Enable maintenance mode', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.pages IS 'Static pages and dynamic content with hierarchical structure';
COMMENT ON TABLE public.categories IS 'Hierarchical categories for organizing content';
COMMENT ON TABLE public.workflow_states IS 'Workflow states for content management';
COMMENT ON TABLE public.content_workflows IS 'Content workflow tracking and assignments';
COMMENT ON TABLE public.roles IS 'Role-based access control system';
COMMENT ON TABLE public.user_roles IS 'User role assignments with expiration';
COMMENT ON TABLE public.media_collections IS 'Media asset collections and galleries';
COMMENT ON TABLE public.content_blocks IS 'Flexible content blocks for page building';
COMMENT ON TABLE public.seo_metadata IS 'SEO and meta data for all content types';
COMMENT ON TABLE public.form_definitions IS 'Custom form definitions with field configurations';
COMMENT ON TABLE public.form_submissions IS 'Form submission data and processing status';
COMMENT ON TABLE public.menus IS 'Site navigation menu definitions';
COMMENT ON TABLE public.menu_items IS 'Menu items with hierarchical structure';
COMMENT ON TABLE public.analytics_sessions IS 'User session tracking for analytics';
COMMENT ON TABLE public.page_performance IS 'Web performance metrics tracking';

COMMENT ON FUNCTION public.generate_unique_slug(TEXT, TEXT, UUID) IS 'Generates unique slugs with automatic numbering';
COMMENT ON FUNCTION public.update_category_counts() IS 'Updates category post and project counts';
COMMENT ON FUNCTION public.create_content_version() IS 'Creates version snapshots of content changes';
COMMENT ON FUNCTION public.transition_workflow(TEXT, UUID, UUID, TEXT, UUID) IS 'Handles workflow state transitions';
COMMENT ON FUNCTION public.advanced_search(TEXT, TEXT[], INTEGER) IS 'Full-text search across multiple content types';

-- =====================================================
-- END OF ENHANCED SCHEMA MIGRATION
-- =====================================================