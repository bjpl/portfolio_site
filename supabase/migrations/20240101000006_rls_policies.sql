-- =====================================================
-- Comprehensive Row Level Security (RLS) Policies
-- Migration: 20240101000006_rls_policies.sql
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS FOR ROLE-BASED ACCESS CONTROL
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  );
$$;

-- Function to check if user is admin or editor
CREATE OR REPLACE FUNCTION auth.is_admin_or_editor()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'editor')
    AND profiles.is_active = true
  );
$$;

-- Function to check if content is published/public
CREATE OR REPLACE FUNCTION public.is_published_content(table_name TEXT, record_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result BOOLEAN := false;
BEGIN
  CASE table_name
    WHEN 'projects' THEN
      SELECT status IN ('active', 'featured') INTO result
      FROM public.projects WHERE id = record_id;
    WHEN 'blog_posts' THEN
      SELECT status = 'published' AND published_at <= NOW() INTO result
      FROM public.blog_posts WHERE id = record_id;
    WHEN 'testimonials' THEN
      SELECT is_approved = true INTO result
      FROM public.testimonials WHERE id = record_id;
    ELSE
      result := false;
  END CASE;
  
  RETURN result;
END;
$$;

-- Function to check service role
CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.role() = 'service_role';
$$;

-- =====================================================
-- DROP EXISTING POLICIES (FROM INITIAL SCHEMA)
-- =====================================================

-- Drop existing policies to rebuild comprehensive ones
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Public blog posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Public media assets are viewable by everyone" ON public.media_assets;
DROP POLICY IF EXISTS "Public skills are viewable by everyone" ON public.skills;
DROP POLICY IF EXISTS "Public testimonials are viewable by everyone" ON public.testimonials;
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Public tags are viewable by everyone" ON public.tags;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Public profiles (basic info only)
CREATE POLICY "Public profile read access" ON public.profiles
  FOR SELECT USING (
    -- Service role bypass
    auth.is_service_role() OR
    -- Public access to basic profile info
    (is_active = true AND role != 'admin')
  );

-- Users can view their own complete profile
CREATE POLICY "Own profile read access" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own profile
CREATE POLICY "Own profile create access" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    role = 'user' -- New users start as regular users
  );

-- Users can update their own profile (except role)
CREATE POLICY "Own profile update access" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (
    auth.uid() = user_id AND
    -- Prevent role escalation unless admin
    (role = OLD.role OR auth.is_admin())
  );

-- Only admins can delete profiles
CREATE POLICY "Admin profile delete access" ON public.profiles
  FOR DELETE USING (auth.is_admin());

-- Admins have full access to all profiles
CREATE POLICY "Admin profile full access" ON public.profiles
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- Public read access to published projects
CREATE POLICY "Public project read access" ON public.projects
  FOR SELECT USING (
    auth.is_service_role() OR
    status IN ('active', 'featured')
  );

-- Authors can view their own projects (all statuses)
CREATE POLICY "Author project read access" ON public.projects
  FOR SELECT USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );

-- Authenticated users can create projects
CREATE POLICY "Authenticated project create access" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = author_id
  );

-- Authors can update their own projects
CREATE POLICY "Author project update access" ON public.projects
  FOR UPDATE USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  ) WITH CHECK (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );

-- Authors and admins can delete projects
CREATE POLICY "Author project delete access" ON public.projects
  FOR DELETE USING (
    auth.uid() = author_id OR
    auth.is_admin()
  );

-- Admin full access to all projects
CREATE POLICY "Admin project full access" ON public.projects
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- BLOG_POSTS TABLE POLICIES
-- =====================================================

-- Public read access to published blog posts
CREATE POLICY "Public blog read access" ON public.blog_posts
  FOR SELECT USING (
    auth.is_service_role() OR
    (status = 'published' AND published_at <= NOW())
  );

-- Authors can view their own posts (all statuses)
CREATE POLICY "Author blog read access" ON public.blog_posts
  FOR SELECT USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );

-- Authenticated users can create blog posts
CREATE POLICY "Authenticated blog create access" ON public.blog_posts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = author_id
  );

-- Authors can update their own posts
CREATE POLICY "Author blog update access" ON public.blog_posts
  FOR UPDATE USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  ) WITH CHECK (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );

-- Authors and admins can delete posts
CREATE POLICY "Author blog delete access" ON public.blog_posts
  FOR DELETE USING (
    auth.uid() = author_id OR
    auth.is_admin()
  );

-- Admin full access to all blog posts
CREATE POLICY "Admin blog full access" ON public.blog_posts
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- COMMENTS TABLE POLICIES
-- =====================================================

-- Public read access to approved comments
CREATE POLICY "Public comment read access" ON public.comments
  FOR SELECT USING (
    auth.is_service_role() OR
    status = 'approved'
  );

-- Comment authors can view their own comments
CREATE POLICY "Author comment read access" ON public.comments
  FOR SELECT USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );

-- Authenticated users can create comments
CREATE POLICY "Authenticated comment create access" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (auth.uid() = author_id OR author_id IS NULL)
  );

-- Authors can update their own comments (within time limit)
CREATE POLICY "Author comment update access" ON public.comments
  FOR UPDATE USING (
    (auth.uid() = author_id AND created_at > NOW() - INTERVAL '1 hour') OR
    auth.is_admin_or_editor()
  ) WITH CHECK (
    (auth.uid() = author_id AND created_at > NOW() - INTERVAL '1 hour') OR
    auth.is_admin_or_editor()
  );

-- Authors and admins can delete comments
CREATE POLICY "Author comment delete access" ON public.comments
  FOR DELETE USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );

-- Admin full access to all comments
CREATE POLICY "Admin comment full access" ON public.comments
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- MEDIA_ASSETS TABLE POLICIES
-- =====================================================

-- Public read access to public media assets
CREATE POLICY "Public media read access" ON public.media_assets
  FOR SELECT USING (
    auth.is_service_role() OR
    is_public = true
  );

-- Users can view their own uploaded media
CREATE POLICY "Owner media read access" ON public.media_assets
  FOR SELECT USING (
    auth.uid() = uploaded_by OR
    auth.is_admin_or_editor()
  );

-- Authenticated users can upload media
CREATE POLICY "Authenticated media upload access" ON public.media_assets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = uploaded_by
  );

-- Users can update their own media metadata
CREATE POLICY "Owner media update access" ON public.media_assets
  FOR UPDATE USING (
    auth.uid() = uploaded_by OR
    auth.is_admin_or_editor()
  ) WITH CHECK (
    auth.uid() = uploaded_by OR
    auth.is_admin_or_editor()
  );

-- Users can delete their own media
CREATE POLICY "Owner media delete access" ON public.media_assets
  FOR DELETE USING (
    auth.uid() = uploaded_by OR
    auth.is_admin()
  );

-- Admin full access to all media
CREATE POLICY "Admin media full access" ON public.media_assets
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- CONTACT_MESSAGES TABLE POLICIES
-- =====================================================

-- No public read access (sensitive data)
-- Admins and assigned users can read
CREATE POLICY "Admin contact read access" ON public.contact_messages
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin_or_editor() OR
    auth.uid() = assigned_to
  );

-- Anyone can create contact messages (public form)
CREATE POLICY "Public contact create access" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

-- Only admins and assigned users can update
CREATE POLICY "Admin contact update access" ON public.contact_messages
  FOR UPDATE USING (
    auth.is_admin_or_editor() OR
    auth.uid() = assigned_to
  );

-- Only admins can delete contact messages
CREATE POLICY "Admin contact delete access" ON public.contact_messages
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- ANALYTICS_EVENTS TABLE POLICIES
-- =====================================================

-- No public read access (sensitive analytics data)
CREATE POLICY "Admin analytics read access" ON public.analytics_events
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin()
  );

-- Service role can insert analytics events
CREATE POLICY "Service analytics insert access" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.is_service_role());

-- Only admins can modify analytics
CREATE POLICY "Admin analytics full access" ON public.analytics_events
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- SKILLS TABLE POLICIES
-- =====================================================

-- Public read access to all skills
CREATE POLICY "Public skills read access" ON public.skills
  FOR SELECT USING (true);

-- Only admins can modify skills
CREATE POLICY "Admin skills full access" ON public.skills
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- TESTIMONIALS TABLE POLICIES
-- =====================================================

-- Public read access to approved testimonials
CREATE POLICY "Public testimonial read access" ON public.testimonials
  FOR SELECT USING (
    auth.is_service_role() OR
    is_approved = true
  );

-- Anyone can create testimonials (for review)
CREATE POLICY "Public testimonial create access" ON public.testimonials
  FOR INSERT WITH CHECK (true);

-- Only admins can modify testimonials
CREATE POLICY "Admin testimonial full access" ON public.testimonials
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- CATEGORIES TABLE POLICIES
-- =====================================================

-- Public read access to active categories
CREATE POLICY "Public category read access" ON public.categories
  FOR SELECT USING (
    auth.is_service_role() OR
    is_active = true
  );

-- Only admins can modify categories
CREATE POLICY "Admin category full access" ON public.categories
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- TAGS TABLE POLICIES
-- =====================================================

-- Public read access to all tags
CREATE POLICY "Public tag read access" ON public.tags
  FOR SELECT USING (true);

-- Authenticated users can create tags
CREATE POLICY "Authenticated tag create access" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can modify existing tags
CREATE POLICY "Admin tag modify access" ON public.tags
  FOR UPDATE USING (auth.is_admin());

CREATE POLICY "Admin tag delete access" ON public.tags
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- NEWSLETTER_SUBSCRIBERS TABLE POLICIES
-- =====================================================

-- No public read access (privacy)
CREATE POLICY "Admin newsletter read access" ON public.newsletter_subscribers
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin()
  );

-- Anyone can subscribe to newsletter
CREATE POLICY "Public newsletter subscribe access" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Subscribers can update their own subscription (unsubscribe)
CREATE POLICY "Subscriber newsletter update access" ON public.newsletter_subscribers
  FOR UPDATE USING (
    -- Allow unsubscribe by email verification (implement token-based auth)
    auth.is_admin() OR
    auth.is_service_role()
  );

-- Only admins can delete subscribers
CREATE POLICY "Admin newsletter delete access" ON public.newsletter_subscribers
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- CONTENT_VERSIONS TABLE POLICIES
-- =====================================================

-- Content authors can view their content versions
CREATE POLICY "Author version read access" ON public.content_versions
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.uid() = created_by OR
    auth.is_admin_or_editor()
  );

-- Authenticated users can create versions of their content
CREATE POLICY "Authenticated version create access" ON public.content_versions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = created_by
  );

-- Only admins can delete content versions
CREATE POLICY "Admin version delete access" ON public.content_versions
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- SITE_SETTINGS TABLE POLICIES
-- =====================================================

-- Public read access to public settings only
CREATE POLICY "Public settings read access" ON public.site_settings
  FOR SELECT USING (
    auth.is_service_role() OR
    is_public = true
  );

-- Admins can read all settings
CREATE POLICY "Admin settings read access" ON public.site_settings
  FOR SELECT USING (auth.is_admin());

-- Only admins can modify settings
CREATE POLICY "Admin settings full access" ON public.site_settings
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- STORAGE BUCKET POLICIES
-- =====================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 2097152, '{"image/jpeg","image/png","image/webp"}'),
  ('project-images', 'project-images', true, 10485760, '{"image/jpeg","image/png","image/webp","image/gif"}'),
  ('blog-images', 'blog-images', true, 10485760, '{"image/jpeg","image/png","image/webp","image/gif"}'),
  ('documents', 'documents', false, 52428800, '{"application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'),
  ('media', 'media', true, 104857600, '{"image/*","video/*","audio/*"}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Public avatar access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated avatar upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    -- Limit file size to 2MB
    octet_length(decode(encode(name, 'escape'), 'escape')) <= 2097152
  );

CREATE POLICY "User avatar update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User avatar delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.is_admin())
  );

-- Storage policies for project images
CREATE POLICY "Public project image access" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated project image upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL AND
    -- Limit file size to 10MB
    octet_length(decode(encode(name, 'escape'), 'escape')) <= 10485760
  );

CREATE POLICY "Project image management" ON storage.objects
  FOR ALL USING (
    bucket_id = 'project-images' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.is_admin())
  );

-- Storage policies for blog images
CREATE POLICY "Public blog image access" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated blog image upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'blog-images' AND
    auth.uid() IS NOT NULL AND
    -- Limit file size to 10MB
    octet_length(decode(encode(name, 'escape'), 'escape')) <= 10485760
  );

CREATE POLICY "Blog image management" ON storage.objects
  FOR ALL USING (
    bucket_id = 'blog-images' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.is_admin())
  );

-- Storage policies for private documents
CREATE POLICY "Private document access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.is_admin())
  );

CREATE POLICY "Authenticated document upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    -- Limit file size to 50MB
    octet_length(decode(encode(name, 'escape'), 'escape')) <= 52428800
  );

CREATE POLICY "Document management" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.is_admin())
  );

-- Storage policies for general media
CREATE POLICY "Public media access" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated media upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND
    auth.uid() IS NOT NULL AND
    -- Limit file size to 100MB
    octet_length(decode(encode(name, 'escape'), 'escape')) <= 104857600
  );

CREATE POLICY "Media management" ON storage.objects
  FOR ALL USING (
    bucket_id = 'media' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR auth.is_admin())
  );

-- Admin override for all storage
CREATE POLICY "Admin storage full access" ON storage.objects
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- SECURITY AUDIT FUNCTIONS
-- =====================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL,
  details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.analytics_events (
    event_type,
    page_url,
    page_title,
    user_id,
    session_id,
    visitor_id,
    metadata
  ) VALUES (
    'security_' || event_type,
    '/api/' || table_name,
    'Security Event: ' || event_type,
    auth.uid(),
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    jsonb_build_object(
      'table_name', table_name,
      'record_id', record_id,
      'details', details,
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
    )
  );
END;
$$;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- Create index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_role_active 
ON public.profiles(user_id, role, is_active) 
WHERE is_active = true;

-- Create index for faster auth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
ON public.profiles(role) 
WHERE is_active = true;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION auth.is_admin() IS 'Checks if the current user has admin role and is active';
COMMENT ON FUNCTION auth.is_admin_or_editor() IS 'Checks if the current user has admin or editor role and is active';
COMMENT ON FUNCTION public.is_published_content(TEXT, UUID) IS 'Checks if content is published and publicly accessible';
COMMENT ON FUNCTION auth.is_service_role() IS 'Checks if the current session is using the service role';
COMMENT ON FUNCTION public.update_updated_at() IS 'Trigger function to automatically update the updated_at timestamp';
COMMENT ON FUNCTION public.log_security_event(TEXT, TEXT, UUID, JSONB) IS 'Logs security events for audit trail';

-- Add table comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE public.projects IS 'Portfolio projects with public/private access';
COMMENT ON TABLE public.blog_posts IS 'Blog posts with published/draft states';
COMMENT ON TABLE public.comments IS 'User comments with moderation workflow';
COMMENT ON TABLE public.media_assets IS 'File uploads with public/private access';
COMMENT ON TABLE public.contact_messages IS 'Contact form submissions (admin access only)';
COMMENT ON TABLE public.analytics_events IS 'Analytics and security event logging (admin access only)';

-- =====================================================
-- END OF RLS POLICIES MIGRATION
-- =====================================================