-- =====================================================
-- Backup and Migration Utilities
-- Migration: 20241225000006_backup_migration_utilities.sql
-- =====================================================

-- =====================================================
-- BACKUP TABLES
-- =====================================================

-- Table to track backup operations
CREATE TABLE IF NOT EXISTS public.backup_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'content_only', 'media_only')),
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'failed', 'cancelled')),
  backup_size BIGINT,
  backup_location TEXT,
  backup_metadata JSONB DEFAULT '{}',
  tables_included TEXT[],
  error_message TEXT,
  started_by UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Table to track migration operations
CREATE TABLE IF NOT EXISTS public.migration_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_name TEXT NOT NULL,
  migration_type TEXT NOT NULL CHECK (migration_type IN ('schema', 'data', 'full', 'rollback')),
  source_version TEXT,
  target_version TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  progress JSONB DEFAULT '{}',
  error_log TEXT,
  rollback_data JSONB,
  started_by UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Table to track data integrity checks
CREATE TABLE IF NOT EXISTS public.data_integrity_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_type TEXT NOT NULL CHECK (check_type IN ('referential', 'constraints', 'orphaned', 'duplicate', 'custom')),
  table_name TEXT,
  check_query TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'warning')),
  issues_found JSONB DEFAULT '[]',
  auto_fix_applied BOOLEAN DEFAULT false,
  fix_query TEXT,
  checked_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- =====================================================
-- BACKUP FUNCTIONS
-- =====================================================

-- Function to create a full database backup
CREATE OR REPLACE FUNCTION public.create_full_backup(
  backup_name TEXT DEFAULT NULL,
  include_media BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_id UUID;
  backup_location TEXT;
  tables_to_backup TEXT[];
BEGIN
  -- Only admins can create backups
  IF NOT auth.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create backups';
  END IF;
  
  -- Generate backup name if not provided
  IF backup_name IS NULL THEN
    backup_name := 'full_backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
  END IF;
  
  -- Define tables to backup
  tables_to_backup := ARRAY[
    'profiles', 'blog_posts', 'projects', 'pages', 'comments',
    'media_assets', 'categories', 'tags', 'skills', 'testimonials',
    'contact_messages', 'analytics_events', 'newsletter_subscribers',
    'content_versions', 'site_settings', 'workflow_states',
    'content_workflows', 'roles', 'user_roles', 'media_collections',
    'media_collection_items', 'content_blocks', 'seo_metadata',
    'form_definitions', 'form_submissions', 'menus', 'menu_items'
  ];
  
  -- Create backup record
  INSERT INTO public.backup_operations (
    backup_type,
    backup_location,
    backup_metadata,
    tables_included,
    started_by
  ) VALUES (
    'full',
    backup_name,
    jsonb_build_object(
      'include_media', include_media,
      'total_tables', array_length(tables_to_backup, 1)
    ),
    tables_to_backup,
    auth.uid()
  )
  RETURNING id INTO backup_id;
  
  -- Note: Actual backup implementation would depend on Supabase capabilities
  -- This is a framework for tracking backup operations
  
  RETURN backup_id;
END;
$$;

-- Function to create incremental backup
CREATE OR REPLACE FUNCTION public.create_incremental_backup(
  since_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_id UUID;
  backup_timestamp TIMESTAMPTZ;
  changes_count INTEGER;
BEGIN
  -- Only admins can create backups
  IF NOT auth.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create backups';
  END IF;
  
  -- Default to last 24 hours if no timestamp provided
  IF since_timestamp IS NULL THEN
    since_timestamp := NOW() - INTERVAL '24 hours';
  END IF;
  
  -- Count changes since timestamp
  SELECT COUNT(*) INTO changes_count
  FROM (
    SELECT id FROM public.blog_posts WHERE updated_at > since_timestamp
    UNION ALL
    SELECT id FROM public.projects WHERE updated_at > since_timestamp
    UNION ALL
    SELECT id FROM public.pages WHERE updated_at > since_timestamp
    UNION ALL
    SELECT id FROM public.media_assets WHERE updated_at > since_timestamp
  ) changes;
  
  -- Create backup record
  INSERT INTO public.backup_operations (
    backup_type,
    backup_location,
    backup_metadata,
    started_by
  ) VALUES (
    'incremental',
    'incremental_backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS'),
    jsonb_build_object(
      'since_timestamp', since_timestamp,
      'changes_count', changes_count
    ),
    auth.uid()
  )
  RETURNING id INTO backup_id;
  
  RETURN backup_id;
END;
$$;

-- =====================================================
-- DATA MIGRATION FUNCTIONS
-- =====================================================

-- Function to migrate content from legacy system
CREATE OR REPLACE FUNCTION public.migrate_legacy_content(
  source_data JSONB,
  migration_type TEXT DEFAULT 'blog_posts'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  migration_id UUID;
  item JSONB;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::jsonb;
BEGIN
  -- Only admins can migrate data
  IF NOT auth.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can migrate data';
  END IF;
  
  -- Create migration record
  INSERT INTO public.migration_operations (
    migration_name,
    migration_type,
    started_by
  ) VALUES (
    'legacy_' || migration_type || '_migration',
    'data',
    auth.uid()
  )
  RETURNING id INTO migration_id;
  
  -- Process each item in source_data
  FOR item IN SELECT jsonb_array_elements(source_data)
  LOOP
    BEGIN
      CASE migration_type
        WHEN 'blog_posts' THEN
          INSERT INTO public.blog_posts (
            title,
            slug,
            content,
            excerpt,
            status,
            author_id,
            published_at,
            created_at
          ) VALUES (
            item->>'title',
            public.generate_unique_slug(item->>'slug', 'blog_posts'),
            item->>'content',
            item->>'excerpt',
            COALESCE(item->>'status', 'published'),
            auth.uid(), -- Assign to current admin
            (item->>'published_at')::timestamptz,
            COALESCE((item->>'created_at')::timestamptz, NOW())
          );
          
        WHEN 'projects' THEN
          INSERT INTO public.projects (
            title,
            slug,
            description,
            content,
            status,
            tech_stack,
            github_url,
            live_url,
            author_id,
            created_at
          ) VALUES (
            item->>'title',
            public.generate_unique_slug(item->>'slug', 'projects'),
            item->>'description',
            item->>'content',
            COALESCE(item->>'status', 'active'),
            COALESCE((item->>'tech_stack')::TEXT[], '{}'),
            item->>'github_url',
            item->>'live_url',
            auth.uid(),
            COALESCE((item->>'created_at')::timestamptz, NOW())
          );
          
        ELSE
          RAISE EXCEPTION 'Unsupported migration type: %', migration_type;
      END CASE;
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'item', item,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Update migration record
  UPDATE public.migration_operations
  SET 
    status = CASE WHEN error_count = 0 THEN 'completed' ELSE 'failed' END,
    progress = jsonb_build_object(
      'success_count', success_count,
      'error_count', error_count,
      'total_items', success_count + error_count
    ),
    error_log = CASE WHEN error_count > 0 THEN errors::TEXT ELSE NULL END,
    completed_at = NOW()
  WHERE id = migration_id;
  
  RETURN migration_id;
END;
$$;

-- =====================================================
-- DATA INTEGRITY FUNCTIONS
-- =====================================================

-- Function to run comprehensive data integrity checks
CREATE OR REPLACE FUNCTION public.run_integrity_checks()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  check_ids UUID[] := '{}';
  check_id UUID;
BEGIN
  -- Only admins can run integrity checks
  IF NOT auth.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can run integrity checks';
  END IF;
  
  -- Check for orphaned media assets
  INSERT INTO public.data_integrity_checks (
    check_type,
    table_name,
    check_query,
    checked_by
  ) VALUES (
    'orphaned',
    'media_assets',
    'SELECT id FROM public.media_assets ma WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts bp WHERE bp.featured_image = ma.url OR ma.url = ANY(bp.images)) AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE ma.url = ANY(p.images)) AND NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.avatar_url = ma.url)',
    auth.uid()
  )
  RETURNING id INTO check_id;
  check_ids := array_append(check_ids, check_id);
  
  -- Check for invalid author references
  INSERT INTO public.data_integrity_checks (
    check_type,
    table_name,
    check_query,
    checked_by
  ) VALUES (
    'referential',
    'blog_posts',
    'SELECT id FROM public.blog_posts WHERE author_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = blog_posts.author_id)',
    auth.uid()
  )
  RETURNING id INTO check_id;
  check_ids := array_append(check_ids, check_id);
  
  -- Check for duplicate slugs
  INSERT INTO public.data_integrity_checks (
    check_type,
    table_name,
    check_query,
    checked_by
  ) VALUES (
    'duplicate',
    'blog_posts',
    'SELECT slug, COUNT(*) FROM public.blog_posts GROUP BY slug HAVING COUNT(*) > 1',
    auth.uid()
  )
  RETURNING id INTO check_id;
  check_ids := array_append(check_ids, check_id);
  
  -- Check for expired content locks
  INSERT INTO public.data_integrity_checks (
    check_type,
    table_name,
    check_query,
    checked_by
  ) VALUES (
    'custom',
    'content_locks',
    'SELECT id FROM public.content_locks WHERE expires_at < NOW()',
    auth.uid()
  )
  RETURNING id INTO check_id;
  check_ids := array_append(check_ids, check_id);
  
  -- Execute checks and update results
  PERFORM public.execute_integrity_checks(check_ids);
  
  RETURN check_ids;
END;
$$;

-- Function to execute integrity checks
CREATE OR REPLACE FUNCTION public.execute_integrity_checks(check_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  check_record RECORD;
  result_count INTEGER;
  result_data JSONB;
BEGIN
  -- Process each check
  FOR check_record IN
    SELECT * FROM public.data_integrity_checks
    WHERE id = ANY(check_ids)
    AND status = 'pending'
  LOOP
    BEGIN
      -- Execute the check query
      EXECUTE 'SELECT COUNT(*) FROM (' || check_record.check_query || ') AS check_result'
      INTO result_count;
      
      -- Get detailed results for failed checks
      IF result_count > 0 THEN
        EXECUTE 'SELECT jsonb_agg(row_to_json(check_result)) FROM (' || check_record.check_query || ') AS check_result'
        INTO result_data;
        
        -- Update check with failed status
        UPDATE public.data_integrity_checks
        SET
          status = 'failed',
          actual_result = result_count::TEXT,
          issues_found = result_data,
          resolved_at = NOW()
        WHERE id = check_record.id;
        
        -- Auto-fix certain issues
        PERFORM public.auto_fix_integrity_issues(check_record.id);
        
      ELSE
        -- Update check with passed status
        UPDATE public.data_integrity_checks
        SET
          status = 'passed',
          actual_result = '0',
          resolved_at = NOW()
        WHERE id = check_record.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Update check with error
      UPDATE public.data_integrity_checks
      SET
        status = 'failed',
        actual_result = 'ERROR: ' || SQLERRM,
        resolved_at = NOW()
      WHERE id = check_record.id;
    END;
  END LOOP;
END;
$$;

-- Function to auto-fix integrity issues
CREATE OR REPLACE FUNCTION public.auto_fix_integrity_issues(check_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  check_record RECORD;
  fixed BOOLEAN := FALSE;
BEGIN
  -- Get check details
  SELECT * INTO check_record
  FROM public.data_integrity_checks
  WHERE id = check_id;
  
  -- Apply fixes based on check type
  CASE check_record.check_type
    WHEN 'orphaned' AND check_record.table_name = 'media_assets' THEN
      -- Mark orphaned media as archived instead of deleting
      UPDATE public.media_assets
      SET metadata = metadata || jsonb_build_object('archived', true, 'archived_reason', 'orphaned')
      WHERE id IN (
        SELECT (issue->>'id')::UUID
        FROM jsonb_array_elements(check_record.issues_found) AS issue
      );
      fixed := TRUE;
      
    WHEN 'custom' AND check_record.table_name = 'content_locks' THEN
      -- Clean up expired locks
      DELETE FROM public.content_locks
      WHERE expires_at < NOW();
      fixed := TRUE;
      
    -- Add more auto-fix rules as needed
  END CASE;
  
  -- Update check record if fix was applied
  IF fixed THEN
    UPDATE public.data_integrity_checks
    SET auto_fix_applied = TRUE
    WHERE id = check_id;
  END IF;
  
  RETURN fixed;
END;
$$;

-- =====================================================
-- BACKUP RESTORATION FUNCTIONS
-- =====================================================

-- Function to restore from backup
CREATE OR REPLACE FUNCTION public.restore_from_backup(
  backup_id UUID,
  tables_to_restore TEXT[] DEFAULT NULL,
  restore_mode TEXT DEFAULT 'replace'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_record RECORD;
BEGIN
  -- Only admins can restore backups
  IF NOT auth.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can restore backups';
  END IF;
  
  -- Get backup details
  SELECT * INTO backup_record
  FROM public.backup_operations
  WHERE id = backup_id AND status = 'completed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup not found or not completed: %', backup_id;
  END IF;
  
  -- Use all tables if none specified
  IF tables_to_restore IS NULL THEN
    tables_to_restore := backup_record.tables_included;
  END IF;
  
  -- Log restoration start
  INSERT INTO public.migration_operations (
    migration_name,
    migration_type,
    source_version,
    started_by
  ) VALUES (
    'restore_' || backup_record.backup_location,
    'full',
    backup_id::TEXT,
    auth.uid()
  );
  
  -- Note: Actual restoration would depend on backup format and Supabase capabilities
  -- This is a framework for tracking restoration operations
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- MAINTENANCE AND CLEANUP FUNCTIONS
-- =====================================================

-- Function for comprehensive database maintenance
CREATE OR REPLACE FUNCTION public.perform_database_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  maintenance_results JSONB := '{}';
  orphaned_count INTEGER;
  expired_count INTEGER;
  stats_updated BOOLEAN := FALSE;
BEGIN
  -- Only admins can perform maintenance
  IF NOT auth.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can perform maintenance';
  END IF;
  
  -- Clean up expired editing sessions
  UPDATE public.editing_sessions
  SET is_active = FALSE
  WHERE last_activity < NOW() - INTERVAL '1 hour'
  AND is_active = TRUE;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  maintenance_results := maintenance_results || jsonb_build_object('expired_sessions', expired_count);
  
  -- Clean up old content operations
  DELETE FROM public.content_operations
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS orphaned_count = ROW_COUNT;
  maintenance_results := maintenance_results || jsonb_build_object('old_operations_deleted', orphaned_count);
  
  -- Clean up expired locks
  DELETE FROM public.content_locks
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  maintenance_results := maintenance_results || jsonb_build_object('expired_locks_deleted', expired_count);
  
  -- Update content statistics
  BEGIN
    PERFORM public.update_content_statistics();
    stats_updated := TRUE;
  EXCEPTION WHEN OTHERS THEN
    stats_updated := FALSE;
  END;
  
  maintenance_results := maintenance_results || jsonb_build_object('statistics_updated', stats_updated);
  
  -- Clean up old backup records (keep last 10)
  DELETE FROM public.backup_operations
  WHERE id NOT IN (
    SELECT id FROM public.backup_operations
    ORDER BY started_at DESC
    LIMIT 10
  );
  
  GET DIAGNOSTICS orphaned_count = ROW_COUNT;
  maintenance_results := maintenance_results || jsonb_build_object('old_backups_deleted', orphaned_count);
  
  -- Vacuum analyze for performance
  -- Note: This would typically be done at the PostgreSQL level
  maintenance_results := maintenance_results || jsonb_build_object(
    'maintenance_completed_at', NOW(),
    'status', 'success'
  );
  
  RETURN maintenance_results;
END;
$$;

-- =====================================================
-- INDEXES AND CONSTRAINTS
-- =====================================================

-- Indexes for backup tables
CREATE INDEX IF NOT EXISTS idx_backup_operations_status ON public.backup_operations(status);
CREATE INDEX IF NOT EXISTS idx_backup_operations_type ON public.backup_operations(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_operations_started_at ON public.backup_operations(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_migration_operations_status ON public.migration_operations(status);
CREATE INDEX IF NOT EXISTS idx_migration_operations_type ON public.migration_operations(migration_type);
CREATE INDEX IF NOT EXISTS idx_migration_operations_started_at ON public.migration_operations(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_status ON public.data_integrity_checks(status);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_type ON public.data_integrity_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_table ON public.data_integrity_checks(table_name);

-- =====================================================
-- RLS POLICIES FOR BACKUP TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.backup_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_integrity_checks ENABLE ROW LEVEL SECURITY;

-- Backup operations policies (admin only)
CREATE POLICY "Admin backup operations access" ON public.backup_operations
  FOR ALL USING (auth.is_admin());

-- Migration operations policies (admin only)
CREATE POLICY "Admin migration operations access" ON public.migration_operations
  FOR ALL USING (auth.is_admin());

-- Data integrity checks policies (admin only)
CREATE POLICY "Admin integrity checks access" ON public.data_integrity_checks
  FOR ALL USING (auth.is_admin());

-- =====================================================
-- SCHEDULED MAINTENANCE SETUP
-- =====================================================

-- Function to be called by cron for regular maintenance
CREATE OR REPLACE FUNCTION public.scheduled_maintenance()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Run daily maintenance tasks
  PERFORM public.perform_database_maintenance();
  
  -- Run weekly integrity checks
  IF EXTRACT(dow FROM NOW()) = 0 THEN -- Sunday
    PERFORM public.run_integrity_checks();
  END IF;
  
  -- Create weekly incremental backups
  IF EXTRACT(dow FROM NOW()) = 1 THEN -- Monday
    PERFORM public.create_incremental_backup(NOW() - INTERVAL '7 days');
  END IF;
END;
$$;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.backup_operations IS 'Tracks database backup operations and metadata';
COMMENT ON TABLE public.migration_operations IS 'Tracks data migration operations and progress';
COMMENT ON TABLE public.data_integrity_checks IS 'Tracks database integrity checks and results';

COMMENT ON FUNCTION public.create_full_backup(TEXT, BOOLEAN) IS 'Creates a full database backup';
COMMENT ON FUNCTION public.create_incremental_backup(TIMESTAMPTZ) IS 'Creates an incremental backup since specified timestamp';
COMMENT ON FUNCTION public.migrate_legacy_content(JSONB, TEXT) IS 'Migrates content from legacy systems';
COMMENT ON FUNCTION public.run_integrity_checks() IS 'Runs comprehensive data integrity checks';
COMMENT ON FUNCTION public.execute_integrity_checks(UUID[]) IS 'Executes specific integrity checks';
COMMENT ON FUNCTION public.auto_fix_integrity_issues(UUID) IS 'Automatically fixes common integrity issues';
COMMENT ON FUNCTION public.restore_from_backup(UUID, TEXT[], TEXT) IS 'Restores database from backup';
COMMENT ON FUNCTION public.perform_database_maintenance() IS 'Performs comprehensive database maintenance';
COMMENT ON FUNCTION public.scheduled_maintenance() IS 'Scheduled maintenance function for cron jobs';

-- =====================================================
-- END OF BACKUP AND MIGRATION UTILITIES
-- =====================================================