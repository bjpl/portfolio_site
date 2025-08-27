-- Fix Existing Schema Migration
-- This handles tables that already exist but may be missing columns

-- Add missing columns to blog_posts if they don't exist
DO $$ 
BEGIN
  -- Check and add visibility column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'visibility') THEN
    ALTER TABLE public.blog_posts 
    ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted'));
  END IF;

  -- Check and add other potentially missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'reading_time') THEN
    ALTER TABLE public.blog_posts ADD COLUMN reading_time INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'view_count') THEN
    ALTER TABLE public.blog_posts ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'like_count') THEN
    ALTER TABLE public.blog_posts ADD COLUMN like_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'comment_count') THEN
    ALTER TABLE public.blog_posts ADD COLUMN comment_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'seo_title') THEN
    ALTER TABLE public.blog_posts ADD COLUMN seo_title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'seo_description') THEN
    ALTER TABLE public.blog_posts ADD COLUMN seo_description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'seo_keywords') THEN
    ALTER TABLE public.blog_posts ADD COLUMN seo_keywords TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'blog_posts' 
                 AND column_name = 'scheduled_for') THEN
    ALTER TABLE public.blog_posts ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add missing columns to projects if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'projects') THEN
    
    -- Add visibility column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'visibility') THEN
      ALTER TABLE public.projects 
      ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private'));
    END IF;

    -- Add other potentially missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'project_type') THEN
      ALTER TABLE public.projects 
      ADD COLUMN project_type TEXT DEFAULT 'web' CHECK (project_type IN ('web', 'mobile', 'desktop', 'api', 'library', 'other'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'view_count') THEN
      ALTER TABLE public.projects ADD COLUMN view_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'like_count') THEN
      ALTER TABLE public.projects ADD COLUMN like_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'seo_title') THEN
      ALTER TABLE public.projects ADD COLUMN seo_title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'seo_description') THEN
      ALTER TABLE public.projects ADD COLUMN seo_description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'seo_keywords') THEN
      ALTER TABLE public.projects ADD COLUMN seo_keywords TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'project_value') THEN
      ALTER TABLE public.projects ADD COLUMN project_value DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'projects' 
                   AND column_name = 'client_name') THEN
      ALTER TABLE public.projects ADD COLUMN client_name TEXT;
    END IF;
  END IF;
END $$;

-- Now recreate the policies safely
DO $$ 
BEGIN
  -- Blog posts policies
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'blog_posts') THEN
    
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
  END IF;

  -- Projects policies
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'projects') THEN
    
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
  END IF;
END $$;