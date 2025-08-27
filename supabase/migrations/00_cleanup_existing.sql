-- =====================================================
-- CLEANUP SCRIPT - Remove Existing Objects Safely
-- Run this BEFORE applying new migrations
-- =====================================================

-- Drop existing policies (safe - won't error if they don't exist)
DO $$ 
BEGIN
    -- Drop all policies on profiles table
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
    DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
    
    -- Drop all policies on blog_posts table
    DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON blog_posts;
    DROP POLICY IF EXISTS "Authors can create posts" ON blog_posts;
    DROP POLICY IF EXISTS "Authors can update own posts" ON blog_posts;
    DROP POLICY IF EXISTS "Authors can delete own posts" ON blog_posts;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON blog_posts;
    DROP POLICY IF EXISTS "Enable read access for published posts" ON blog_posts;
    DROP POLICY IF EXISTS "Enable update for post authors" ON blog_posts;
    DROP POLICY IF EXISTS "Enable delete for post authors" ON blog_posts;
    
    -- Drop all policies on projects table
    DROP POLICY IF EXISTS "Active projects are viewable by everyone" ON projects;
    DROP POLICY IF EXISTS "Users can create projects" ON projects;
    DROP POLICY IF EXISTS "Users can update own projects" ON projects;
    DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
    DROP POLICY IF EXISTS "Enable read access for active projects" ON projects;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
    DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
    DROP POLICY IF EXISTS "Enable delete for project owners" ON projects;
    
    -- Drop all policies on media_assets table
    DROP POLICY IF EXISTS "Media assets are viewable by everyone" ON media_assets;
    DROP POLICY IF EXISTS "Users can upload media" ON media_assets;
    DROP POLICY IF EXISTS "Users can update own media" ON media_assets;
    DROP POLICY IF EXISTS "Users can delete own media" ON media_assets;
    
    -- Drop all policies on content_versions table
    DROP POLICY IF EXISTS "Content versions viewable by content owners" ON content_versions;
    DROP POLICY IF EXISTS "System can create versions" ON content_versions;
    
    -- Drop storage policies
    DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
    DROP POLICY IF EXISTS "Public read access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Silently continue if any errors occur
        NULL;
END $$;

-- Check what tables currently exist
SELECT 'Existing tables before migration:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check existing policies
SELECT 'Existing policies before cleanup:' as status;
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname IN ('public', 'storage')
ORDER BY tablename, policyname;