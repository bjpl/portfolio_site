-- Safe Admin User Creation
-- This version checks for column existence before inserting

-- First ensure all columns exist
DO $$ 
BEGIN
  -- Add any missing columns to profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE public.profiles ADD COLUMN location TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'website') THEN
    ALTER TABLE public.profiles ADD COLUMN website TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'social_links') THEN
    ALTER TABLE public.profiles ADD COLUMN social_links JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferences') THEN
    ALTER TABLE public.profiles ADD COLUMN preferences JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Now create the admin user with only existing columns
INSERT INTO public.profiles (
  id,
  username,
  full_name,
  bio,
  is_admin
) 
SELECT 
  auth.uid() as id,
  COALESCE(
    LOWER(REPLACE(raw_user_meta_data->>'full_name', ' ', '_')),
    SPLIT_PART(email, '@', 1)
  ) as username,
  COALESCE(raw_user_meta_data->>'full_name', 'Admin User') as full_name,
  'Portfolio site administrator' as bio,
  true as is_admin
FROM auth.users
WHERE id = auth.uid()
ON CONFLICT (id) DO UPDATE SET
  is_admin = true,
  updated_at = CURRENT_TIMESTAMP;

-- Now update with additional fields if columns exist
UPDATE public.profiles
SET 
  website = 'https://your-portfolio.com',
  location = 'Your City',
  social_links = jsonb_build_object(
    'github', 'https://github.com/yourusername',
    'linkedin', 'https://linkedin.com/in/yourusername',
    'twitter', 'https://twitter.com/yourusername'
  ),
  preferences = jsonb_build_object(
    'theme', 'dark',
    'emailNotifications', true,
    'publicProfile', true
  )
WHERE id = auth.uid();

-- Verify admin was created
SELECT 
  id,
  username,
  full_name,
  bio,
  is_admin,
  created_at,
  updated_at
FROM public.profiles
WHERE id = auth.uid();