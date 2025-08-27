-- Cleanup and Reset Migration
-- This safely removes existing objects before recreating them
-- Run this FIRST to clean up any existing schema

-- Drop existing policies safely
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Media assets are viewable by everyone" ON public.media_assets;
DROP POLICY IF EXISTS "Users can insert their own media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Users can update their own media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Users can delete their own media assets" ON public.media_assets;

DROP POLICY IF EXISTS "Published blog posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Users can view their own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Users can insert their own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Users can update their own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Users can delete their own blog posts" ON public.blog_posts;

DROP POLICY IF EXISTS "Published projects are viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view their own content versions" ON public.content_versions;
DROP POLICY IF EXISTS "Users can insert their own content versions" ON public.content_versions;

-- Drop triggers safely
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_media_assets_updated_at ON public.media_assets;
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop indexes safely
DROP INDEX IF EXISTS idx_profiles_username;
DROP INDEX IF EXISTS idx_profiles_created_at;
DROP INDEX IF EXISTS idx_media_assets_user_id;
DROP INDEX IF EXISTS idx_media_assets_filename;
DROP INDEX IF EXISTS idx_media_assets_mime_type;
DROP INDEX IF EXISTS idx_media_assets_created_at;
DROP INDEX IF EXISTS idx_media_assets_tags;
DROP INDEX IF EXISTS idx_blog_posts_user_id;
DROP INDEX IF EXISTS idx_blog_posts_slug;
DROP INDEX IF EXISTS idx_blog_posts_status;
DROP INDEX IF EXISTS idx_blog_posts_published_at;
DROP INDEX IF EXISTS idx_blog_posts_created_at;
DROP INDEX IF EXISTS idx_blog_posts_tags;
DROP INDEX IF EXISTS idx_blog_posts_categories;
DROP INDEX IF EXISTS idx_blog_posts_title_search;
DROP INDEX IF EXISTS idx_blog_posts_content_search;
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
DROP INDEX IF EXISTS idx_content_versions_content_id;
DROP INDEX IF EXISTS idx_content_versions_content_type;
DROP INDEX IF EXISTS idx_content_versions_user_id;
DROP INDEX IF EXISTS idx_content_versions_version_number;
DROP INDEX IF EXISTS idx_content_versions_is_current;
DROP INDEX IF EXISTS idx_content_versions_created_at;
DROP INDEX IF EXISTS idx_blog_posts_status_published_at;
DROP INDEX IF EXISTS idx_projects_status_featured;
DROP INDEX IF EXISTS idx_content_versions_content_type_id;

-- Drop tables safely (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.content_versions CASCADE;
DROP TABLE IF EXISTS public.blog_posts CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.media_assets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions safely
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;