-- Create Admin User Script
-- This creates an admin profile for the currently authenticated user

-- Create or update admin profile for current user
INSERT INTO public.profiles (
  id,
  username,
  full_name,
  bio,
  website,
  location,
  is_admin,
  social_links,
  preferences
) 
SELECT 
  auth.uid() as id,
  COALESCE(
    LOWER(REPLACE(raw_user_meta_data->>'full_name', ' ', '_')),
    SPLIT_PART(email, '@', 1)
  ) as username,
  COALESCE(raw_user_meta_data->>'full_name', 'Admin User') as full_name,
  'Portfolio site administrator' as bio,
  'https://your-portfolio.com' as website,
  'Your City' as location,
  true as is_admin,
  jsonb_build_object(
    'github', 'https://github.com/yourusername',
    'linkedin', 'https://linkedin.com/in/yourusername',
    'twitter', 'https://twitter.com/yourusername'
  ) as social_links,
  jsonb_build_object(
    'theme', 'dark',
    'emailNotifications', true,
    'publicProfile', true
  ) as preferences
FROM auth.users
WHERE id = auth.uid()
ON CONFLICT (id) DO UPDATE SET
  is_admin = true,
  updated_at = CURRENT_TIMESTAMP,
  bio = COALESCE(EXCLUDED.bio, profiles.bio),
  social_links = COALESCE(profiles.social_links, EXCLUDED.social_links),
  preferences = COALESCE(profiles.preferences, EXCLUDED.preferences);

-- Verify admin was created
SELECT 
  id,
  username,
  full_name,
  is_admin,
  created_at,
  updated_at
FROM public.profiles
WHERE id = auth.uid();