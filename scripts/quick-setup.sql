-- Quick Setup SQL for Supabase
-- Run this in your Supabase SQL Editor (https://app.supabase.com)

-- Create posts table for blog content
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  author TEXT DEFAULT 'Brandon JP Lambert',
  category TEXT,
  tags TEXT[],
  draft BOOLEAN DEFAULT false,
  featured_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pages table for static pages
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media table for images and files
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Create public read policies
CREATE POLICY "Public can read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public can read pages" ON pages FOR SELECT USING (true);
CREATE POLICY "Public can read media" ON media FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);

-- Insert sample data
INSERT INTO posts (title, slug, content, excerpt, tags) 
VALUES 
  ('Welcome to Your New Portfolio', 'welcome', 'This is your new Next.js + Supabase powered portfolio!', 'Welcome to your new site...', ARRAY['announcement', 'meta']),
  ('Migration Complete', 'migration-complete', 'Successfully migrated from Hugo to Next.js with Supabase backend.', 'The migration is done...', ARRAY['technical', 'update'])
ON CONFLICT (slug) DO NOTHING;