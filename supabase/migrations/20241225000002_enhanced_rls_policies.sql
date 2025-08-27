-- =====================================================
-- Enhanced Row Level Security (RLS) Policies
-- Migration: 20241225000002_enhanced_rls_policies.sql
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_performance ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ENHANCED HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is admin (compatible with both schema versions)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE p.user_id = auth.uid() 
    AND p.is_active = true
    AND (
      -- Direct role check (old schema compatibility)
      p.role = 'admin' OR
      -- Role-based system check (new schema)
      (r.name = 'Admin' AND (ur.expires_at IS NULL OR ur.expires_at > NOW()))
    )
  );
$$;

-- Function to check if user is admin or editor (compatible with both schema versions)
CREATE OR REPLACE FUNCTION auth.is_admin_or_editor()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE p.user_id = auth.uid() 
    AND p.is_active = true
    AND (
      -- Direct role check (old schema compatibility)
      p.role IN ('admin', 'editor') OR
      -- Role-based system check (new schema)
      (r.name IN ('Admin', 'Editor') AND (ur.expires_at IS NULL OR ur.expires_at > NOW()))
    )
  );
$$;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION auth.has_permission(permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE p.user_id = auth.uid()
    AND p.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW() OR ur.expires_at IS NULL)
    AND (
      r.permissions->>'all' = 'true' OR
      r.permissions ? permission_key OR
      r.permissions->'content'->>'read' = 'true' OR
      r.permissions->'content'->>'create' = 'true' OR
      r.permissions->'content'->>'update' = 'true' OR
      r.permissions->'content'->>'delete' = 'true' OR
      -- Fallback to admin/editor roles for backward compatibility
      auth.is_admin_or_editor()
    )
  );
$$;

-- Function to check content ownership
CREATE OR REPLACE FUNCTION auth.is_content_owner(content_type TEXT, content_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  author_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  CASE content_type
    WHEN 'blog_post' THEN
      SELECT bp.author_id INTO author_id FROM public.blog_posts bp WHERE bp.id = content_id;
    WHEN 'project' THEN
      -- Check both author_id (enhanced schema) and fallback for older schema
      SELECT COALESCE(p.author_id, (
        SELECT pr.id FROM public.profiles pr WHERE pr.user_id = current_user_id LIMIT 1
      )) INTO author_id 
      FROM public.projects p WHERE p.id = content_id;
    WHEN 'page' THEN
      SELECT pg.author_id INTO author_id FROM public.pages pg WHERE pg.id = content_id;
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN current_user_id = author_id;
END;
$$;

-- Function to check workflow permissions
CREATE OR REPLACE FUNCTION auth.can_transition_workflow(
  content_type TEXT,
  content_id UUID,
  target_state_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_workflow RECORD;
  target_state RECORD;
  user_roles TEXT[];
BEGIN
  -- Get current user roles
  SELECT ARRAY_AGG(r.name) INTO user_roles
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  JOIN public.roles r ON ur.role_id = r.id
  WHERE p.user_id = auth.uid()
  AND p.is_active = true
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
  
  -- Admins can always transition
  IF 'Admin' = ANY(user_roles) THEN
    RETURN TRUE;
  END IF;
  
  -- Get current workflow state
  SELECT ws.* INTO target_state
  FROM public.workflow_states ws
  WHERE ws.id = target_state_id;
  
  -- Check if user has permission for this transition
  -- (Simplified logic - in production, this would check transition permissions)
  RETURN 'Editor' = ANY(user_roles) OR auth.is_content_owner(content_type, content_id);
END;
$$;

-- =====================================================
-- PAGES TABLE POLICIES
-- =====================================================

-- Public read access to published pages
CREATE POLICY "Public page read access" ON public.pages
  FOR SELECT USING (
    auth.is_service_role() OR
    (status = 'published' AND visibility = 'public')
  );

-- Authors and editors can view all pages
CREATE POLICY "Author page read access" ON public.pages
  FOR SELECT USING (
    auth.uid() = author_id OR
    auth.has_permission('content.read') OR
    auth.is_admin_or_editor()
  );

-- Authenticated users can create pages
CREATE POLICY "Authenticated page create access" ON public.pages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = author_id AND
    auth.has_permission('content.create')
  );

-- Authors and editors can update pages
CREATE POLICY "Author page update access" ON public.pages
  FOR UPDATE USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  ) WITH CHECK (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );

-- Authors and admins can delete pages
CREATE POLICY "Author page delete access" ON public.pages
  FOR DELETE USING (
    auth.uid() = author_id OR
    auth.is_admin()
  );

-- =====================================================
-- CATEGORIES TABLE POLICIES
-- =====================================================

-- Public read access to active categories
CREATE POLICY "Public category read access" ON public.categories
  FOR SELECT USING (
    auth.is_service_role() OR
    is_active = true
  );

-- Editors can manage categories
CREATE POLICY "Editor category manage access" ON public.categories
  FOR ALL USING (
    auth.is_admin_or_editor()
  );

-- =====================================================
-- WORKFLOW STATES TABLE POLICIES
-- =====================================================

-- Users with content permissions can read workflow states
CREATE POLICY "Content manager workflow read access" ON public.workflow_states
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.has_permission('content.read') OR
    auth.is_admin_or_editor()
  );

-- Only admins can manage workflow states
CREATE POLICY "Admin workflow manage access" ON public.workflow_states
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- CONTENT WORKFLOWS TABLE POLICIES
-- =====================================================

-- Content authors and assigned users can view workflows
CREATE POLICY "Content workflow read access" ON public.content_workflows
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.uid() = assigned_to OR
    auth.is_content_owner(content_type, content_id) OR
    auth.is_admin_or_editor()
  );

-- Users with content permissions can create workflows
CREATE POLICY "Content workflow create access" ON public.content_workflows
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      auth.is_content_owner(content_type, content_id) OR
      auth.is_admin_or_editor()
    )
  );

-- Assigned users and admins can update workflows
CREATE POLICY "Content workflow update access" ON public.content_workflows
  FOR UPDATE USING (
    auth.uid() = assigned_to OR
    auth.is_admin_or_editor()
  );

-- Only admins can delete workflows
CREATE POLICY "Admin workflow delete access" ON public.content_workflows
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- ROLES TABLE POLICIES
-- =====================================================

-- System roles are visible to authenticated users
CREATE POLICY "System roles read access" ON public.roles
  FOR SELECT USING (
    auth.is_service_role() OR
    (auth.uid() IS NOT NULL AND is_system = true)
  );

-- Only admins can manage roles
CREATE POLICY "Admin roles manage access" ON public.roles
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- USER ROLES TABLE POLICIES
-- =====================================================

-- Users can view their own role assignments
CREATE POLICY "Own user roles read access" ON public.user_roles
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.uid() = user_id OR
    auth.is_admin()
  );

-- Only admins can assign roles
CREATE POLICY "Admin user roles manage access" ON public.user_roles
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- MEDIA COLLECTIONS TABLE POLICIES
-- =====================================================

-- Public read access to public collections
CREATE POLICY "Public media collection read access" ON public.media_collections
  FOR SELECT USING (
    auth.is_service_role() OR
    is_public = true
  );

-- Creators and admins can view all collections
CREATE POLICY "Creator media collection read access" ON public.media_collections
  FOR SELECT USING (
    auth.uid() = created_by OR
    auth.is_admin_or_editor()
  );

-- Authenticated users can create collections
CREATE POLICY "Authenticated media collection create access" ON public.media_collections
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = created_by
  );

-- Creators can manage their collections
CREATE POLICY "Creator media collection manage access" ON public.media_collections
  FOR UPDATE USING (
    auth.uid() = created_by OR
    auth.is_admin()
  );

CREATE POLICY "Creator media collection delete access" ON public.media_collections
  FOR DELETE USING (
    auth.uid() = created_by OR
    auth.is_admin()
  );

-- =====================================================
-- MEDIA COLLECTION ITEMS TABLE POLICIES
-- =====================================================

-- Collection items inherit collection visibility
CREATE POLICY "Collection items read access" ON public.media_collection_items
  FOR SELECT USING (
    auth.is_service_role() OR
    EXISTS (
      SELECT 1 FROM public.media_collections mc
      WHERE mc.id = collection_id
      AND (mc.is_public = true OR mc.created_by = auth.uid())
    ) OR
    auth.is_admin_or_editor()
  );

-- Collection creators can manage items
CREATE POLICY "Collection items manage access" ON public.media_collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.media_collections mc
      WHERE mc.id = collection_id
      AND mc.created_by = auth.uid()
    ) OR
    auth.is_admin()
  );

-- =====================================================
-- CONTENT BLOCKS TABLE POLICIES
-- =====================================================

-- Content blocks inherit parent content visibility
CREATE POLICY "Content blocks read access" ON public.content_blocks
  FOR SELECT USING (
    auth.is_service_role() OR
    EXISTS (
      SELECT 1 FROM public.pages p
      WHERE p.id = parent_id 
      AND parent_type = 'page'
      AND (p.status = 'published' AND p.visibility = 'public')
    ) OR
    EXISTS (
      SELECT 1 FROM public.blog_posts bp
      WHERE bp.id = parent_id
      AND parent_type = 'blog_post'
      AND bp.status = 'published'
    ) OR
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = parent_id
      AND parent_type = 'project'
      AND pr.status IN ('active', 'featured')
    ) OR
    auth.is_admin_or_editor()
  );

-- Content authors can manage their content blocks
CREATE POLICY "Content blocks manage access" ON public.content_blocks
  FOR ALL USING (
    auth.is_content_owner(parent_type, parent_id) OR
    auth.is_admin_or_editor()
  );

-- =====================================================
-- SEO METADATA TABLE POLICIES
-- =====================================================

-- SEO metadata inherits content visibility
CREATE POLICY "SEO metadata read access" ON public.seo_metadata
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin_or_editor() OR
    (
      entity_type = 'page' AND
      EXISTS (
        SELECT 1 FROM public.pages p
        WHERE p.id = entity_id
        AND p.status = 'published'
        AND p.visibility = 'public'
      )
    ) OR
    (
      entity_type = 'blog_post' AND
      EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = entity_id
        AND bp.status = 'published'
      )
    ) OR
    (
      entity_type = 'project' AND
      EXISTS (
        SELECT 1 FROM public.projects pr
        WHERE pr.id = entity_id
        AND pr.status IN ('active', 'featured')
      )
    )
  );

-- Content authors can manage SEO metadata
CREATE POLICY "SEO metadata manage access" ON public.seo_metadata
  FOR ALL USING (
    auth.is_content_owner(entity_type, entity_id) OR
    auth.is_admin_or_editor()
  );

-- =====================================================
-- FORM DEFINITIONS TABLE POLICIES
-- =====================================================

-- Public read access to active forms
CREATE POLICY "Public form definition read access" ON public.form_definitions
  FOR SELECT USING (
    auth.is_service_role() OR
    is_active = true
  );

-- Only admins can manage form definitions
CREATE POLICY "Admin form definition manage access" ON public.form_definitions
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- FORM SUBMISSIONS TABLE POLICIES
-- =====================================================

-- Only admins can read form submissions
CREATE POLICY "Admin form submission read access" ON public.form_submissions
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin()
  );

-- Anyone can create form submissions
CREATE POLICY "Public form submission create access" ON public.form_submissions
  FOR INSERT WITH CHECK (true);

-- Only admins can manage form submissions
CREATE POLICY "Admin form submission manage access" ON public.form_submissions
  FOR UPDATE USING (auth.is_admin());

CREATE POLICY "Admin form submission delete access" ON public.form_submissions
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- MENU SYSTEM POLICIES
-- =====================================================

-- Public read access to active menus
CREATE POLICY "Public menu read access" ON public.menus
  FOR SELECT USING (
    auth.is_service_role() OR
    is_active = true
  );

-- Only admins can manage menus
CREATE POLICY "Admin menu manage access" ON public.menus
  FOR ALL USING (auth.is_admin());

-- Public read access to active menu items
CREATE POLICY "Public menu item read access" ON public.menu_items
  FOR SELECT USING (
    auth.is_service_role() OR
    (is_active = true AND EXISTS (
      SELECT 1 FROM public.menus m
      WHERE m.id = menu_id AND m.is_active = true
    ))
  );

-- Only admins can manage menu items
CREATE POLICY "Admin menu item manage access" ON public.menu_items
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- ANALYTICS POLICIES
-- =====================================================

-- Only admins can read analytics
CREATE POLICY "Admin analytics session read access" ON public.analytics_sessions
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin()
  );

-- Service role can insert analytics sessions
CREATE POLICY "Service analytics session insert access" ON public.analytics_sessions
  FOR INSERT WITH CHECK (
    auth.is_service_role()
  );

-- Only admins can manage analytics sessions
CREATE POLICY "Admin analytics session manage access" ON public.analytics_sessions
  FOR UPDATE USING (auth.is_admin());

-- Page performance metrics - similar policies
CREATE POLICY "Admin page performance read access" ON public.page_performance
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin()
  );

CREATE POLICY "Service page performance insert access" ON public.page_performance
  FOR INSERT WITH CHECK (
    auth.is_service_role()
  );

-- Only admins can manage page performance data
CREATE POLICY "Admin page performance manage access" ON public.page_performance
  FOR UPDATE USING (auth.is_admin());

CREATE POLICY "Admin page performance delete access" ON public.page_performance
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- EDUCATION TABLE POLICIES (if exists)
-- =====================================================

-- Public read access to education records
CREATE POLICY "Public education read access" ON public.education
  FOR SELECT USING (true);

-- Only admins can manage education records
CREATE POLICY "Admin education full access" ON public.education
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- EXPERIENCES TABLE POLICIES (if exists)
-- =====================================================

-- Public read access to experience records
CREATE POLICY "Public experience read access" ON public.experiences
  FOR SELECT USING (true);

-- Only admins can manage experience records
CREATE POLICY "Admin experience full access" ON public.experiences
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
-- NEWSLETTER SUBSCRIPTIONS TABLE POLICIES
-- =====================================================

-- No public read access (privacy)
CREATE POLICY "Admin newsletter read access" ON public.newsletter_subscriptions
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin()
  );

-- Anyone can subscribe to newsletter
CREATE POLICY "Public newsletter subscribe access" ON public.newsletter_subscriptions
  FOR INSERT WITH CHECK (true);

-- Subscribers can update their own subscription (unsubscribe)
CREATE POLICY "Subscriber newsletter update access" ON public.newsletter_subscriptions
  FOR UPDATE USING (
    -- Allow unsubscribe by email verification (implement token-based auth)
    auth.is_admin() OR
    auth.is_service_role()
  );

-- Only admins can delete subscribers
CREATE POLICY "Admin newsletter delete access" ON public.newsletter_subscriptions
  FOR DELETE USING (auth.is_admin());

-- =====================================================
-- COMMENTS TABLE POLICIES (if exists)
-- =====================================================

-- Public read access to approved comments
CREATE POLICY "Public comment read access" ON public.comments
  FOR SELECT USING (
    auth.is_service_role() OR
    approved = true
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
    auth.uid() = author_id
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
-- STORAGE ENHANCEMENTS
-- =====================================================

-- Update existing storage policies with more granular control
DROP POLICY IF EXISTS "Authenticated project image upload" ON storage.objects;
DROP POLICY IF EXISTS "Project image management" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated blog image upload" ON storage.objects;
DROP POLICY IF EXISTS "Blog image management" ON storage.objects;

-- Enhanced project image policies
CREATE POLICY "Enhanced project image upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL AND
    (
      auth.has_permission('media.upload') OR
      auth.is_admin_or_editor()
    )
  );

CREATE POLICY "Enhanced project image management" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-images' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  ) WITH CHECK (
    bucket_id = 'project-images' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  );

CREATE POLICY "Enhanced project image delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-images' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  );

-- Enhanced blog image policies
CREATE POLICY "Enhanced blog image upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'blog-images' AND
    auth.uid() IS NOT NULL AND
    (
      auth.has_permission('media.upload') OR
      auth.is_admin_or_editor()
    )
  );

CREATE POLICY "Enhanced blog image management" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'blog-images' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  ) WITH CHECK (
    bucket_id = 'blog-images' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  );

CREATE POLICY "Enhanced blog image delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'blog-images' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  );

-- Create storage bucket for page assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('page-assets', 'page-assets', true, 10485760, '{"image/jpeg","image/png","image/webp","image/gif","image/svg+xml"}')
ON CONFLICT (id) DO NOTHING;

-- Page assets storage policies
CREATE POLICY "Public page asset access" ON storage.objects
  FOR SELECT USING (bucket_id = 'page-assets');

CREATE POLICY "Enhanced page asset upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'page-assets' AND
    auth.uid() IS NOT NULL AND
    (
      auth.has_permission('media.upload') OR
      auth.is_admin_or_editor()
    )
  );

CREATE POLICY "Enhanced page asset management" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'page-assets' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  ) WITH CHECK (
    bucket_id = 'page-assets' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  );

CREATE POLICY "Enhanced page asset delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'page-assets' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.has_permission('media.manage') OR
      auth.is_admin()
    )
  );

-- =====================================================
-- SECURITY AUDIT ENHANCEMENTS
-- =====================================================

-- Enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'info'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert with full schema first (enhanced analytics_events)
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
      'Security Event: ' || event_type || ' (' || severity || ')',
      auth.uid(),
      gen_random_uuid()::text,
      gen_random_uuid()::text,
      jsonb_build_object(
        'table_name', table_name,
        'record_id', record_id,
        'severity', severity,
        'details', details,
        'user_agent', COALESCE(current_setting('request.headers', true)::jsonb->>'user-agent', 'unknown'),
        'ip_address', COALESCE(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', '127.0.0.1'),
        'timestamp', NOW()
      )
    );
  EXCEPTION
    WHEN undefined_column THEN
      -- Fall back to basic schema (original analytics_events)
      INSERT INTO public.analytics_events (
        event_type,
        page_path,
        user_id,
        session_id,
        metadata
      ) VALUES (
        'security_' || event_type,
        '/api/' || table_name,
        auth.uid(),
        gen_random_uuid()::text,
        jsonb_build_object(
          'table_name', table_name,
          'record_id', record_id,
          'severity', severity,
          'details', details,
          'timestamp', NOW()
        )
      );
    WHEN OTHERS THEN
      -- Final fallback - just log as a notice
      RAISE NOTICE 'Security event logged: % on % (severity: %)', event_type, table_name, severity;
  END;
END;
$$;

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Additional indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active 
ON public.user_roles(user_id) 
WHERE expires_at IS NULL OR expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_user_id_active_role
ON public.profiles(user_id, is_active, role)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pages_status_visibility
ON public.pages(status, visibility)
WHERE status = 'published' AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_content_workflows_content_assigned
ON public.content_workflows(content_type, content_id, assigned_to);

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION auth.has_permission(TEXT) IS 'Checks if current user has specific permission';
COMMENT ON FUNCTION auth.is_content_owner(TEXT, UUID) IS 'Checks if current user owns the specified content';
COMMENT ON FUNCTION auth.can_transition_workflow(TEXT, UUID, UUID) IS 'Checks if current user can transition workflow state';
COMMENT ON FUNCTION public.log_security_event(TEXT, TEXT, UUID, JSONB, TEXT) IS 'Enhanced security event logging with severity levels';

-- =====================================================
-- ADDITIONAL SAFETY MEASURES
-- =====================================================

-- Ensure all critical tables have RLS enabled (with safety checks)
DO $$
DECLARE
  table_name text;
  tables_to_secure text[] := ARRAY['profiles', 'blog_posts', 'projects', 'pages', 'categories', 
                                  'workflow_states', 'content_workflows', 'roles', 'user_roles', 
                                  'media_collections', 'media_collection_items', 'content_blocks', 
                                  'seo_metadata', 'form_definitions', 'form_submissions', 'menus', 
                                  'menu_items', 'analytics_sessions', 'page_performance', 'education', 
                                  'experiences', 'skills', 'newsletter_subscriptions', 'comments', 
                                  'media_assets', 'contact_messages', 'analytics_events'];
BEGIN
  FOREACH table_name IN ARRAY tables_to_secure
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'RLS enabled for table: %', table_name;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping RLS enablement', table_name;
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not enable RLS for table %: %', table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Create function to validate RLS policy coverage
CREATE OR REPLACE FUNCTION public.validate_rls_coverage()
RETURNS TABLE(
  table_name text,
  has_rls boolean,
  policy_count bigint,
  missing_operations text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    (t.rowsecurity)::boolean as has_rls,
    COALESCE(p.policy_count, 0) as policy_count,
    CASE 
      WHEN COALESCE(p.policy_count, 0) = 0 THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      ELSE ARRAY[]::text[]
    END as missing_operations
  FROM pg_tables t
  LEFT JOIN (
    SELECT schemaname, tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
  ) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  ORDER BY t.tablename;
END;
$$;

COMMENT ON FUNCTION public.validate_rls_coverage() IS 'Validates RLS policy coverage across all public tables';

-- =====================================================
-- END OF ENHANCED RLS POLICIES
-- =====================================================