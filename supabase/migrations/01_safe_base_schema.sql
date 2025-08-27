-- Safe Base Portfolio Schema Migration
-- This version checks for existing objects before creating them
-- Created: 2024-12-24

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  location TEXT,
  social_links JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  
  -- Create new policies
  CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

  CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

  CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);
END $$;

-- Media Assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  alt_text TEXT,
  caption TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_optimized BOOLEAN DEFAULT false,
  optimization_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on media_assets
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Create media_assets policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Media assets are viewable by everyone" ON public.media_assets;
  DROP POLICY IF EXISTS "Users can insert their own media assets" ON public.media_assets;
  DROP POLICY IF EXISTS "Users can update their own media assets" ON public.media_assets;
  DROP POLICY IF EXISTS "Users can delete their own media assets" ON public.media_assets;
  
  CREATE POLICY "Media assets are viewable by everyone" 
    ON public.media_assets FOR SELECT 
    USING (true);

  CREATE POLICY "Users can insert their own media assets" 
    ON public.media_assets FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own media assets" 
    ON public.media_assets FOR UPDATE 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own media assets" 
    ON public.media_assets FOR DELETE 
    USING (auth.uid() = user_id);
END $$;

-- Blog Posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  content_html TEXT,
  featured_image_id UUID REFERENCES public.media_assets(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  reading_time INTEGER,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create blog_posts policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Published blog posts are viewable by everyone" ON public.blog_posts;
  DROP POLICY IF EXISTS "Users can view their own blog posts" ON public.blog_posts;
  DROP POLICY IF EXISTS "Users can insert their own blog posts" ON public.blog_posts;
  DROP POLICY IF EXISTS "Users can update their own blog posts" ON public.blog_posts;
  DROP POLICY IF EXISTS "Users can delete their own blog posts" ON public.blog_posts;
  
  CREATE POLICY "Published blog posts are viewable by everyone" 
    ON public.blog_posts FOR SELECT 
    USING (status = 'published' AND visibility = 'public');

  CREATE POLICY "Users can view their own blog posts" 
    ON public.blog_posts FOR SELECT 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own blog posts" 
    ON public.blog_posts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own blog posts" 
    ON public.blog_posts FOR UPDATE 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own blog posts" 
    ON public.blog_posts FOR DELETE 
    USING (auth.uid() = user_id);
END $$;

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  content_html TEXT,
  featured_image_id UUID REFERENCES public.media_assets(id),
  gallery_images UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  technologies TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  project_type TEXT DEFAULT 'web' CHECK (project_type IN ('web', 'mobile', 'desktop', 'api', 'library', 'other')),
  demo_url TEXT,
  github_url TEXT,
  live_url TEXT,
  start_date DATE,
  end_date DATE,
  client_name TEXT,
  project_value DECIMAL(10,2),
  featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create projects policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Published projects are viewable by everyone" ON public.projects;
  DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
  DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
  DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
  DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
  
  CREATE POLICY "Published projects are viewable by everyone" 
    ON public.projects FOR SELECT 
    USING (status = 'published' AND visibility = 'public');

  CREATE POLICY "Users can view their own projects" 
    ON public.projects FOR SELECT 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own projects" 
    ON public.projects FOR UPDATE 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own projects" 
    ON public.projects FOR DELETE 
    USING (auth.uid() = user_id);
END $$;

-- Content Versions table (for versioning blog posts and projects)
CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'project')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  content_html TEXT,
  metadata JSONB DEFAULT '{}',
  version_number INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT false,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on content_versions
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- Create content_versions policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own content versions" ON public.content_versions;
  DROP POLICY IF EXISTS "Users can insert their own content versions" ON public.content_versions;
  
  CREATE POLICY "Users can view their own content versions" 
    ON public.content_versions FOR SELECT 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own content versions" 
    ON public.content_versions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Create indexes for better performance (drop if exists first)
DROP INDEX IF EXISTS idx_profiles_username;
DROP INDEX IF EXISTS idx_profiles_created_at;
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

DROP INDEX IF EXISTS idx_media_assets_user_id;
DROP INDEX IF EXISTS idx_media_assets_filename;
DROP INDEX IF EXISTS idx_media_assets_mime_type;
DROP INDEX IF EXISTS idx_media_assets_created_at;
DROP INDEX IF EXISTS idx_media_assets_tags;
CREATE INDEX idx_media_assets_user_id ON public.media_assets(user_id);
CREATE INDEX idx_media_assets_filename ON public.media_assets(filename);
CREATE INDEX idx_media_assets_mime_type ON public.media_assets(mime_type);
CREATE INDEX idx_media_assets_created_at ON public.media_assets(created_at);
CREATE INDEX idx_media_assets_tags ON public.media_assets USING GIN(tags);

DROP INDEX IF EXISTS idx_blog_posts_user_id;
DROP INDEX IF EXISTS idx_blog_posts_slug;
DROP INDEX IF EXISTS idx_blog_posts_status;
DROP INDEX IF EXISTS idx_blog_posts_published_at;
DROP INDEX IF EXISTS idx_blog_posts_created_at;
DROP INDEX IF EXISTS idx_blog_posts_tags;
DROP INDEX IF EXISTS idx_blog_posts_categories;
DROP INDEX IF EXISTS idx_blog_posts_title_search;
DROP INDEX IF EXISTS idx_blog_posts_content_search;
CREATE INDEX idx_blog_posts_user_id ON public.blog_posts(user_id);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX idx_blog_posts_created_at ON public.blog_posts(created_at);
CREATE INDEX idx_blog_posts_tags ON public.blog_posts USING GIN(tags);
CREATE INDEX idx_blog_posts_categories ON public.blog_posts USING GIN(categories);
CREATE INDEX idx_blog_posts_title_search ON public.blog_posts USING GIN(to_tsvector('english', title));
CREATE INDEX idx_blog_posts_content_search ON public.blog_posts USING GIN(to_tsvector('english', content));

DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_projects_slug;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_featured;
DROP INDEX IF EXISTS idx_projects_sort_order;
DROP INDEX IF EXISTS idx_projects_created_at;
DROP INDEX IF EXISTS idx_projects_technologies;
DROP INDEX IF EXISTS idx_projects_tags;
DROP INDEX IF EXISTS idx_projects_categories;
DROP INDEX IF EXISTS idx_projects_title_search;
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_slug ON public.projects(slug);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_featured ON public.projects(featured);
CREATE INDEX idx_projects_sort_order ON public.projects(sort_order);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);
CREATE INDEX idx_projects_technologies ON public.projects USING GIN(technologies);
CREATE INDEX idx_projects_tags ON public.projects USING GIN(tags);
CREATE INDEX idx_projects_categories ON public.projects USING GIN(categories);
CREATE INDEX idx_projects_title_search ON public.projects USING GIN(to_tsvector('english', title));

DROP INDEX IF EXISTS idx_content_versions_content_id;
DROP INDEX IF EXISTS idx_content_versions_content_type;
DROP INDEX IF EXISTS idx_content_versions_user_id;
DROP INDEX IF EXISTS idx_content_versions_version_number;
DROP INDEX IF EXISTS idx_content_versions_is_current;
DROP INDEX IF EXISTS idx_content_versions_created_at;
CREATE INDEX idx_content_versions_content_id ON public.content_versions(content_id);
CREATE INDEX idx_content_versions_content_type ON public.content_versions(content_type);
CREATE INDEX idx_content_versions_user_id ON public.content_versions(user_id);
CREATE INDEX idx_content_versions_version_number ON public.content_versions(version_number);
CREATE INDEX idx_content_versions_is_current ON public.content_versions(is_current);
CREATE INDEX idx_content_versions_created_at ON public.content_versions(created_at);

-- Create composite indexes for common queries
DROP INDEX IF EXISTS idx_blog_posts_status_published_at;
DROP INDEX IF EXISTS idx_projects_status_featured;
DROP INDEX IF EXISTS idx_content_versions_content_type_id;
CREATE INDEX idx_blog_posts_status_published_at ON public.blog_posts(status, published_at);
CREATE INDEX idx_projects_status_featured ON public.projects(status, featured);
CREATE INDEX idx_content_versions_content_type_id ON public.content_versions(content_type, content_id);

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE public.media_assets IS 'Uploaded media files with metadata';
COMMENT ON TABLE public.blog_posts IS 'Blog posts with versioning support';
COMMENT ON TABLE public.projects IS 'Portfolio projects with rich metadata';
COMMENT ON TABLE public.content_versions IS 'Version history for blog posts and projects';