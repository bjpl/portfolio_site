-- =====================================================
-- Hugo to Supabase Migration Schema
-- Enhanced schema specifically for Hugo content migration
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =====================================================
-- HUGO CONTENT TABLES
-- =====================================================

-- Hugo blog posts migration table
CREATE TABLE IF NOT EXISTS public.hugo_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  hugo_path TEXT NOT NULL UNIQUE,
  frontmatter JSONB DEFAULT '{}',
  
  -- Hugo-specific fields
  date TIMESTAMPTZ NOT NULL,
  draft BOOLEAN DEFAULT false,
  weight INTEGER,
  layout TEXT,
  type TEXT DEFAULT 'post',
  
  -- Content metadata
  author TEXT DEFAULT 'Brandon JP Lambert',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  
  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,
  featured_image TEXT,
  
  -- Content analysis
  reading_time INTEGER,
  word_count INTEGER,
  
  -- Multilingual support
  language TEXT DEFAULT 'en',
  translations JSONB DEFAULT '{}',
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Status and publishing
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hugo projects migration table
CREATE TABLE IF NOT EXISTS public.hugo_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  hugo_path TEXT NOT NULL UNIQUE,
  frontmatter JSONB DEFAULT '{}',
  
  -- Project-specific fields
  project_type TEXT NOT NULL, -- 'built', 'strategies', 'resources', 'work'
  tech_stack TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}', -- Alternative field name
  github_url TEXT,
  live_url TEXT,
  demo_url TEXT,
  repository_url TEXT,
  
  -- Project metadata
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  featured BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  
  -- Project details
  start_date DATE,
  end_date DATE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  team_size INTEGER,
  my_role TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'featured')),
  date TIMESTAMPTZ,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hugo academic content migration table
CREATE TABLE IF NOT EXISTS public.hugo_academic_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  hugo_path TEXT NOT NULL UNIQUE,
  frontmatter JSONB DEFAULT '{}',
  
  -- Academic fields
  theory_category TEXT NOT NULL, -- 'sla-theory', 'pedagogy', 'linguistics'
  academic_level TEXT DEFAULT 'intermediate',
  subject_area TEXT,
  
  -- Content organization
  parent_topic TEXT,
  related_topics TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  
  -- Academic metadata
  citations JSONB DEFAULT '[]',
  references JSONB DEFAULT '[]',
  bibliography JSONB DEFAULT '[]',
  keywords TEXT[] DEFAULT '{}',
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  
  -- Content metrics
  reading_time INTEGER,
  word_count INTEGER,
  complexity_score INTEGER,
  
  -- Status
  status TEXT DEFAULT 'published',
  date TIMESTAMPTZ,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  citation_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hugo creative works migration table
CREATE TABLE IF NOT EXISTS public.hugo_creative_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  hugo_path TEXT NOT NULL UNIQUE,
  frontmatter JSONB DEFAULT '{}',
  
  -- Creative work fields
  work_type TEXT NOT NULL CHECK (work_type IN ('poetry', 'prose', 'essay', 'story')),
  original_language TEXT DEFAULT 'en',
  translation TEXT,
  is_bilingual BOOLEAN DEFAULT false,
  
  -- Creative metadata
  style_notes TEXT,
  inspiration TEXT,
  themes TEXT[] DEFAULT '{}',
  mood TEXT,
  tone TEXT,
  
  -- Literary analysis
  meter TEXT, -- For poetry
  rhyme_scheme TEXT, -- For poetry
  literary_devices TEXT[] DEFAULT '{}',
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  genres TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  
  -- Publishing
  date TIMESTAMPTZ,
  featured BOOLEAN DEFAULT false,
  published_in TEXT, -- Publication venue
  
  -- Content metrics
  line_count INTEGER, -- For poetry
  stanza_count INTEGER, -- For poetry
  word_count INTEGER,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hugo URL mappings for SEO preservation
CREATE TABLE IF NOT EXISTS public.hugo_url_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hugo_path TEXT NOT NULL UNIQUE,
  hugo_url TEXT NOT NULL UNIQUE,
  supabase_table TEXT NOT NULL,
  supabase_id UUID NOT NULL,
  redirect_type INTEGER DEFAULT 301,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hugo media migration tracking
CREATE TABLE IF NOT EXISTS public.hugo_media_migration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_path TEXT NOT NULL UNIQUE,
  hugo_url TEXT NOT NULL,
  supabase_url TEXT,
  migration_status TEXT DEFAULT 'pending' CHECK (migration_status IN ('pending', 'completed', 'failed', 'skipped')),
  
  -- File metadata
  file_size BIGINT,
  mime_type TEXT,
  category TEXT, -- 'images', 'videos', 'documents', etc.
  unique_name TEXT,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_attempted TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration log for tracking the process
CREATE TABLE IF NOT EXISTS public.hugo_migration_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_type TEXT NOT NULL, -- 'content', 'media', 'url_mapping'
  source_path TEXT,
  target_table TEXT,
  target_id UUID,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Hugo posts indexes
CREATE INDEX IF NOT EXISTS idx_hugo_posts_slug ON public.hugo_posts(slug);
CREATE INDEX IF NOT EXISTS idx_hugo_posts_hugo_path ON public.hugo_posts(hugo_path);
CREATE INDEX IF NOT EXISTS idx_hugo_posts_status ON public.hugo_posts(status);
CREATE INDEX IF NOT EXISTS idx_hugo_posts_date ON public.hugo_posts(date);
CREATE INDEX IF NOT EXISTS idx_hugo_posts_language ON public.hugo_posts(language);
CREATE INDEX IF NOT EXISTS idx_hugo_posts_tags ON public.hugo_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_hugo_posts_categories ON public.hugo_posts USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_hugo_posts_frontmatter ON public.hugo_posts USING GIN(frontmatter);

-- Hugo projects indexes
CREATE INDEX IF NOT EXISTS idx_hugo_projects_slug ON public.hugo_projects(slug);
CREATE INDEX IF NOT EXISTS idx_hugo_projects_hugo_path ON public.hugo_projects(hugo_path);
CREATE INDEX IF NOT EXISTS idx_hugo_projects_project_type ON public.hugo_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_hugo_projects_status ON public.hugo_projects(status);
CREATE INDEX IF NOT EXISTS idx_hugo_projects_featured ON public.hugo_projects(featured);
CREATE INDEX IF NOT EXISTS idx_hugo_projects_language ON public.hugo_projects(language);
CREATE INDEX IF NOT EXISTS idx_hugo_projects_tags ON public.hugo_projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_hugo_projects_tech_stack ON public.hugo_projects USING GIN(tech_stack);

-- Hugo academic content indexes
CREATE INDEX IF NOT EXISTS idx_hugo_academic_slug ON public.hugo_academic_content(slug);
CREATE INDEX IF NOT EXISTS idx_hugo_academic_hugo_path ON public.hugo_academic_content(hugo_path);
CREATE INDEX IF NOT EXISTS idx_hugo_academic_theory_category ON public.hugo_academic_content(theory_category);
CREATE INDEX IF NOT EXISTS idx_hugo_academic_difficulty ON public.hugo_academic_content(difficulty);
CREATE INDEX IF NOT EXISTS idx_hugo_academic_language ON public.hugo_academic_content(language);
CREATE INDEX IF NOT EXISTS idx_hugo_academic_tags ON public.hugo_academic_content USING GIN(tags);

-- Hugo creative works indexes
CREATE INDEX IF NOT EXISTS idx_hugo_creative_slug ON public.hugo_creative_works(slug);
CREATE INDEX IF NOT EXISTS idx_hugo_creative_hugo_path ON public.hugo_creative_works(hugo_path);
CREATE INDEX IF NOT EXISTS idx_hugo_creative_work_type ON public.hugo_creative_works(work_type);
CREATE INDEX IF NOT EXISTS idx_hugo_creative_language ON public.hugo_creative_works(original_language);
CREATE INDEX IF NOT EXISTS idx_hugo_creative_featured ON public.hugo_creative_works(featured);
CREATE INDEX IF NOT EXISTS idx_hugo_creative_themes ON public.hugo_creative_works USING GIN(themes);

-- URL mappings indexes
CREATE INDEX IF NOT EXISTS idx_hugo_url_mappings_hugo_path ON public.hugo_url_mappings(hugo_path);
CREATE INDEX IF NOT EXISTS idx_hugo_url_mappings_hugo_url ON public.hugo_url_mappings(hugo_url);
CREATE INDEX IF NOT EXISTS idx_hugo_url_mappings_table_id ON public.hugo_url_mappings(supabase_table, supabase_id);

-- Media migration indexes
CREATE INDEX IF NOT EXISTS idx_hugo_media_original_path ON public.hugo_media_migration(original_path);
CREATE INDEX IF NOT EXISTS idx_hugo_media_status ON public.hugo_media_migration(migration_status);
CREATE INDEX IF NOT EXISTS idx_hugo_media_category ON public.hugo_media_migration(category);

-- Migration log indexes
CREATE INDEX IF NOT EXISTS idx_hugo_migration_log_type ON public.hugo_migration_log(migration_type);
CREATE INDEX IF NOT EXISTS idx_hugo_migration_log_status ON public.hugo_migration_log(status);
CREATE INDEX IF NOT EXISTS idx_hugo_migration_log_created_at ON public.hugo_migration_log(created_at);

-- =====================================================
-- FULL-TEXT SEARCH INDEXES
-- =====================================================

-- Hugo posts full-text search
CREATE INDEX IF NOT EXISTS idx_hugo_posts_fts ON public.hugo_posts 
USING GIN(to_tsvector('english', 
  coalesce(title, '') || ' ' || 
  coalesce(content, '') || ' ' || 
  coalesce(excerpt, '') || ' ' || 
  coalesce(description, '')
));

-- Hugo projects full-text search
CREATE INDEX IF NOT EXISTS idx_hugo_projects_fts ON public.hugo_projects 
USING GIN(to_tsvector('english', 
  coalesce(title, '') || ' ' || 
  coalesce(description, '') || ' ' || 
  coalesce(content, '')
));

-- Hugo academic content full-text search
CREATE INDEX IF NOT EXISTS idx_hugo_academic_fts ON public.hugo_academic_content 
USING GIN(to_tsvector('english', 
  coalesce(title, '') || ' ' || 
  coalesce(content, '') || ' ' || 
  coalesce(theory_category, '')
));

-- Hugo creative works full-text search
CREATE INDEX IF NOT EXISTS idx_hugo_creative_fts ON public.hugo_creative_works 
USING GIN(to_tsvector('english', 
  coalesce(title, '') || ' ' || 
  coalesce(content, '') || ' ' || 
  coalesce(translation, '')
));

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all Hugo content tables
CREATE TRIGGER update_hugo_posts_updated_at BEFORE UPDATE ON public.hugo_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hugo_projects_updated_at BEFORE UPDATE ON public.hugo_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hugo_academic_updated_at BEFORE UPDATE ON public.hugo_academic_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hugo_creative_updated_at BEFORE UPDATE ON public.hugo_creative_works
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate reading time
CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content IS NOT NULL THEN
        -- Calculate reading time (200 words per minute)
        NEW.reading_time = CEIL(
            array_length(string_to_array(trim(NEW.content), ' '), 1) / 200.0
        );
        
        -- Calculate word count
        NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply reading time calculation to content tables
CREATE TRIGGER calculate_hugo_posts_reading_time 
    BEFORE INSERT OR UPDATE ON public.hugo_posts
    FOR EACH ROW EXECUTE FUNCTION calculate_reading_time();

CREATE TRIGGER calculate_hugo_academic_reading_time 
    BEFORE INSERT OR UPDATE ON public.hugo_academic_content
    FOR EACH ROW EXECUTE FUNCTION calculate_reading_time();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all Hugo tables
ALTER TABLE public.hugo_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hugo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hugo_academic_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hugo_creative_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hugo_url_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hugo_media_migration ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Hugo posts are viewable by everyone" ON public.hugo_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Hugo projects are viewable by everyone" ON public.hugo_projects
  FOR SELECT USING (status IN ('active', 'featured'));

CREATE POLICY "Hugo academic content is viewable by everyone" ON public.hugo_academic_content
  FOR SELECT USING (status = 'published');

CREATE POLICY "Hugo creative works are viewable by everyone" ON public.hugo_creative_works
  FOR SELECT USING (true);

CREATE POLICY "Hugo URL mappings are viewable by everyone" ON public.hugo_url_mappings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Hugo media migrations are viewable by everyone" ON public.hugo_media_migration
  FOR SELECT USING (migration_status = 'completed');

-- Admin access for content management
-- (These will be expanded with proper auth setup)

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to search across all Hugo content
CREATE OR REPLACE FUNCTION search_hugo_content(search_query TEXT)
RETURNS TABLE (
  content_type TEXT,
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'blog'::TEXT as content_type,
    p.id,
    p.title,
    p.slug,
    p.excerpt,
    ts_rank(to_tsvector('english', p.title || ' ' || p.content), plainto_tsquery('english', search_query)) as rank
  FROM hugo_posts p
  WHERE to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', search_query)
    AND p.status = 'published'
  
  UNION ALL
  
  SELECT 
    'project'::TEXT as content_type,
    pr.id,
    pr.title,
    pr.slug,
    pr.description as excerpt,
    ts_rank(to_tsvector('english', pr.title || ' ' || coalesce(pr.content, '')), plainto_tsquery('english', search_query)) as rank
  FROM hugo_projects pr
  WHERE to_tsvector('english', pr.title || ' ' || coalesce(pr.content, '')) @@ plainto_tsquery('english', search_query)
    AND pr.status IN ('active', 'featured')
  
  UNION ALL
  
  SELECT 
    'academic'::TEXT as content_type,
    ac.id,
    ac.title,
    ac.slug,
    substring(ac.content, 1, 200) as excerpt,
    ts_rank(to_tsvector('english', ac.title || ' ' || ac.content), plainto_tsquery('english', search_query)) as rank
  FROM hugo_academic_content ac
  WHERE to_tsvector('english', ac.title || ' ' || ac.content) @@ plainto_tsquery('english', search_query)
    AND ac.status = 'published'
  
  UNION ALL
  
  SELECT 
    'creative'::TEXT as content_type,
    cw.id,
    cw.title,
    cw.slug,
    substring(cw.content, 1, 200) as excerpt,
    ts_rank(to_tsvector('english', cw.title || ' ' || cw.content), plainto_tsquery('english', search_query)) as rank
  FROM hugo_creative_works cw
  WHERE to_tsvector('english', cw.title || ' ' || cw.content) @@ plainto_tsquery('english', search_query)
  
  ORDER BY rank DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function to get related content
CREATE OR REPLACE FUNCTION get_related_content(content_table TEXT, content_id UUID, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  related_type TEXT,
  related_id UUID,
  related_title TEXT,
  related_slug TEXT,
  similarity_score REAL
) AS $$
BEGIN
  -- This is a simplified version - can be enhanced with more sophisticated similarity algorithms
  IF content_table = 'hugo_posts' THEN
    RETURN QUERY
    SELECT 
      'blog'::TEXT as related_type,
      p.id as related_id,
      p.title as related_title,
      p.slug as related_slug,
      (
        SELECT COUNT(*)::REAL / GREATEST(array_length(p.tags, 1), 1)
        FROM unnest(p.tags) t1
        JOIN unnest((SELECT tags FROM hugo_posts WHERE id = content_id)) t2 ON t1 = t2
      ) as similarity_score
    FROM hugo_posts p
    WHERE p.id != content_id 
      AND p.status = 'published'
      AND p.tags && (SELECT tags FROM hugo_posts WHERE id = content_id)
    ORDER BY similarity_score DESC
    LIMIT limit_count;
  END IF;
  
  -- Add similar logic for other content types...
  
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION HELPER FUNCTIONS
-- =====================================================

-- Function to log migration steps
CREATE OR REPLACE FUNCTION log_migration_step(
  p_migration_type TEXT,
  p_source_path TEXT,
  p_target_table TEXT,
  p_target_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO hugo_migration_log (
    migration_type,
    source_path,
    target_table,
    target_id,
    status,
    error_message,
    metadata,
    processing_time_ms
  ) VALUES (
    p_migration_type,
    p_source_path,
    p_target_table,
    p_target_id,
    p_status,
    p_error_message,
    p_metadata,
    p_processing_time_ms
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA AND CONFIGURATION
-- =====================================================

-- Insert migration configuration
INSERT INTO public.site_settings (key, value, type, category, description, is_public)
VALUES 
  ('hugo_migration_enabled', 'true', 'boolean', 'migration', 'Enable Hugo content migration features', false),
  ('hugo_migration_batch_size', '10', 'number', 'migration', 'Batch size for content migration', false),
  ('hugo_content_backup_enabled', 'true', 'boolean', 'migration', 'Enable content backup before migration', false),
  ('hugo_url_redirects_enabled', 'true', 'boolean', 'migration', 'Enable automatic URL redirects', true)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SCHEMA VALIDATION
-- =====================================================

-- Verify all tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'hugo_%';
    
  IF table_count < 5 THEN
    RAISE EXCEPTION 'Hugo migration schema setup incomplete. Expected at least 5 tables, found %', table_count;
  END IF;
  
  RAISE NOTICE 'Hugo migration schema setup complete. Created % tables.', table_count;
END $$;