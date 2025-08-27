-- Test Operations Script
-- This script tests basic CRUD operations on the portfolio schema

-- First, create a test user profile (assuming you're authenticated)
-- Replace the ID with your actual auth.uid() if needed
DO $$
DECLARE
  test_user_id UUID;
  test_post_id UUID;
  test_project_id UUID;
BEGIN
  -- Get current user ID or create a test UUID
  test_user_id := COALESCE(auth.uid(), gen_random_uuid());
  
  -- Insert or update a test profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    bio,
    website,
    location,
    is_admin
  ) VALUES (
    test_user_id,
    'testuser',
    'Test User',
    'This is a test bio',
    'https://example.com',
    'Test City',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    bio = EXCLUDED.bio,
    updated_at = CURRENT_TIMESTAMP;
  
  RAISE NOTICE 'Profile created/updated for user: %', test_user_id;

  -- Create a test blog post
  INSERT INTO public.blog_posts (
    user_id,
    title,
    slug,
    excerpt,
    content,
    status,
    visibility,
    tags,
    categories,
    published_at
  ) VALUES (
    test_user_id,
    'My First Blog Post',
    'my-first-blog-post',
    'This is an excerpt of my first blog post',
    'This is the full content of my first blog post. It contains lots of interesting information.',
    'published',
    'public',
    ARRAY['test', 'first-post'],
    ARRAY['tutorials'],
    CURRENT_TIMESTAMP
  )
  RETURNING id INTO test_post_id;
  
  RAISE NOTICE 'Blog post created with ID: %', test_post_id;

  -- Create a test project
  INSERT INTO public.projects (
    user_id,
    title,
    slug,
    description,
    content,
    status,
    visibility,
    technologies,
    tags,
    project_type,
    github_url,
    live_url,
    featured
  ) VALUES (
    test_user_id,
    'My Portfolio Website',
    'my-portfolio-website',
    'A modern portfolio website built with Next.js and Supabase',
    'This project showcases my skills in full-stack development...',
    'published',
    'public',
    ARRAY['Next.js', 'Supabase', 'TypeScript', 'Tailwind CSS'],
    ARRAY['web-development', 'portfolio'],
    'web',
    'https://github.com/testuser/portfolio',
    'https://portfolio.example.com',
    true
  )
  RETURNING id INTO test_project_id;
  
  RAISE NOTICE 'Project created with ID: %', test_project_id;
  
  -- Output summary
  RAISE NOTICE 'Test data created successfully!';
END $$;

-- Query to verify the data was created
SELECT 'Profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'Blog Posts', COUNT(*) FROM public.blog_posts
UNION ALL
SELECT 'Projects', COUNT(*) FROM public.projects
ORDER BY table_name;

-- Show the created data
SELECT 
  'Profile' as type,
  username as identifier,
  full_name as title,
  created_at
FROM public.profiles
LIMIT 1

UNION ALL

SELECT 
  'Blog Post' as type,
  slug as identifier,
  title,
  created_at
FROM public.blog_posts
LIMIT 1

UNION ALL

SELECT 
  'Project' as type,
  slug as identifier,
  title,
  created_at
FROM public.projects
LIMIT 1;