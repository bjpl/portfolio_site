-- =====================================================
-- Advanced Storage Configuration with Versioning
-- Migration: 20241225000003_advanced_storage_config.sql
-- =====================================================

-- =====================================================
-- ENHANCED STORAGE BUCKETS
-- =====================================================

-- Create additional storage buckets for different use cases
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, avif_autodetection) VALUES
  -- Version control for media assets
  ('media-versions', 'media-versions', false, 10485760, '{"image/jpeg","image/png","image/webp","image/gif"}', true),
  
  -- Temporary uploads before processing
  ('temp-uploads', 'temp-uploads', false, 52428800, '{"image/*","video/*","audio/*","application/pdf","text/*"}', false),
  
  -- Optimized thumbnails and previews
  ('thumbnails', 'thumbnails', true, 2097152, '{"image/jpeg","image/png","image/webp"}', true),
  
  -- Backup storage
  ('backups', 'backups', false, 104857600, '{"application/json","application/sql","text/*"}', false),
  
  -- User-generated content
  ('user-content', 'user-content', true, 20971520, '{"image/*","video/mp4","video/webm","audio/*"}', true),
  
  -- System assets (logos, icons, etc.)
  ('system-assets', 'system-assets', true, 5242880, '{"image/*","application/pdf"}', true)

ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  avif_autodetection = EXCLUDED.avif_autodetection;

-- =====================================================
-- STORAGE VERSIONING SYSTEM
-- =====================================================

-- Storage version tracking table
CREATE TABLE IF NOT EXISTS public.storage_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_file_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  bucket_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  checksum TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage processing queue
CREATE TABLE IF NOT EXISTS public.storage_processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
  processing_type TEXT NOT NULL CHECK (processing_type IN ('thumbnail', 'optimize', 'convert', 'backup')),
  source_bucket TEXT NOT NULL,
  source_path TEXT NOT NULL,
  target_bucket TEXT,
  target_path TEXT,
  options JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STORAGE POLICIES FOR NEW BUCKETS
-- =====================================================

-- Media versions (private, for version control)
CREATE POLICY "Media version owner access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'media-versions' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.is_admin()
    )
  );

-- Temporary uploads (private, short-lived)
CREATE POLICY "Temp upload owner access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'temp-uploads' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.is_admin()
    )
  );

-- Thumbnails (public read, admin manage)
CREATE POLICY "Public thumbnail read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Admin thumbnail manage access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'thumbnails' AND
    auth.is_admin()
  );

-- Backups (admin only)
CREATE POLICY "Admin backup full access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'backups' AND
    auth.is_admin()
  );

-- User content (public read, user manage own)
CREATE POLICY "Public user content read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-content');

CREATE POLICY "User content owner access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-content' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      auth.is_admin()
    )
  );

-- System assets (public read, admin manage)
CREATE POLICY "Public system asset read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'system-assets');

CREATE POLICY "Admin system asset manage access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'system-assets' AND
    auth.is_admin()
  );

-- =====================================================
-- STORAGE UTILITY FUNCTIONS
-- =====================================================

-- Function to generate file variants (thumbnails, optimized versions)
CREATE OR REPLACE FUNCTION public.queue_file_processing(
  file_id UUID,
  processing_types TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  media_record RECORD;
  processing_type TEXT;
BEGIN
  -- Get media asset details
  SELECT * INTO media_record
  FROM public.media_assets
  WHERE id = file_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Queue each processing type
  FOREACH processing_type IN ARRAY processing_types
  LOOP
    INSERT INTO public.storage_processing_queue (
      file_id,
      processing_type,
      source_bucket,
      source_path,
      target_bucket,
      target_path,
      options
    ) VALUES (
      file_id,
      processing_type,
      'media', -- Assuming source bucket
      media_record.filename,
      CASE processing_type
        WHEN 'thumbnail' THEN 'thumbnails'
        WHEN 'optimize' THEN 'media'
        WHEN 'backup' THEN 'backups'
        ELSE 'media'
      END,
      CASE processing_type
        WHEN 'thumbnail' THEN regexp_replace(media_record.filename, '\.[^.]*$', '_thumb.webp')
        WHEN 'optimize' THEN regexp_replace(media_record.filename, '\.[^.]*$', '_optimized.webp')
        WHEN 'backup' THEN 'backups/' || media_record.filename
        ELSE media_record.filename
      END,
      jsonb_build_object(
        'quality', CASE processing_type WHEN 'thumbnail' THEN 85 ELSE 90 END,
        'width', CASE processing_type WHEN 'thumbnail' THEN 300 ELSE NULL END,
        'height', CASE processing_type WHEN 'thumbnail' THEN 300 ELSE NULL END
      )
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Function to clean up old file versions
CREATE OR REPLACE FUNCTION public.cleanup_old_versions(
  keep_versions INTEGER DEFAULT 5,
  older_than INTERVAL DEFAULT '30 days'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  version_record RECORD;
BEGIN
  -- Find versions to delete (keeping the most recent ones)
  FOR version_record IN
    SELECT sv.*
    FROM public.storage_versions sv
    WHERE sv.created_at < NOW() - older_than
    AND sv.version_number <= (
      SELECT MAX(sv2.version_number) - keep_versions
      FROM public.storage_versions sv2
      WHERE sv2.original_file_id = sv.original_file_id
    )
  LOOP
    -- Delete from storage
    PERFORM storage.delete_object(version_record.bucket_id, version_record.file_path);
    
    -- Delete record
    DELETE FROM public.storage_versions WHERE id = version_record.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Function to get file metadata and generate signed URLs
CREATE OR REPLACE FUNCTION public.get_file_metadata(file_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  media_record RECORD;
  result JSONB;
BEGIN
  -- Get media asset details
  SELECT ma.*, p.full_name as uploaded_by_name
  INTO media_record
  FROM public.media_assets ma
  LEFT JOIN public.profiles p ON ma.uploaded_by = p.id
  WHERE ma.id = file_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Build result JSON
  result := jsonb_build_object(
    'id', media_record.id,
    'filename', media_record.filename,
    'original_filename', media_record.original_filename,
    'url', media_record.url,
    'type', media_record.type,
    'mime_type', media_record.mime_type,
    'size_bytes', media_record.size_bytes,
    'width', media_record.width,
    'height', media_record.height,
    'alt_text', media_record.alt_text,
    'caption', media_record.caption,
    'uploaded_by', media_record.uploaded_by,
    'uploaded_by_name', media_record.uploaded_by_name,
    'created_at', media_record.created_at,
    'updated_at', media_record.updated_at
  );
  
  -- Add thumbnail URL if exists
  IF EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'thumbnails'
    AND name LIKE '%' || regexp_replace(media_record.filename, '\.[^.]*$', '_thumb.webp')
  ) THEN
    result := result || jsonb_build_object(
      'thumbnail_url', 
      format('%s/storage/v1/object/public/thumbnails/%s', 
        current_setting('app.supabase_url', true),
        regexp_replace(media_record.filename, '\.[^.]*$', '_thumb.webp')
      )
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function to handle bulk file operations
CREATE OR REPLACE FUNCTION public.bulk_file_operation(
  file_ids UUID[],
  operation TEXT,
  options JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::jsonb;
  result JSONB;
BEGIN
  -- Process each file
  FOREACH file_id IN ARRAY file_ids
  LOOP
    BEGIN
      CASE operation
        WHEN 'delete' THEN
          -- Soft delete - mark as archived
          UPDATE public.media_assets
          SET metadata = metadata || jsonb_build_object('archived', true, 'archived_at', NOW())
          WHERE id = file_id AND uploaded_by = auth.uid();
          
        WHEN 'move_to_collection' THEN
          -- Add to media collection
          INSERT INTO public.media_collection_items (collection_id, media_asset_id, added_by)
          VALUES ((options->>'collection_id')::UUID, file_id, auth.uid())
          ON CONFLICT DO NOTHING;
          
        WHEN 'update_metadata' THEN
          -- Update file metadata
          UPDATE public.media_assets
          SET 
            alt_text = COALESCE(options->>'alt_text', alt_text),
            caption = COALESCE(options->>'caption', caption),
            tags = COALESCE((options->>'tags')::TEXT[], tags),
            updated_at = NOW()
          WHERE id = file_id AND uploaded_by = auth.uid();
          
        WHEN 'process' THEN
          -- Queue for processing
          PERFORM public.queue_file_processing(
            file_id,
            (options->>'processing_types')::TEXT[]
          );
          
        ELSE
          RAISE EXCEPTION 'Invalid operation: %', operation;
      END CASE;
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'file_id', file_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Return results
  result := jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'total_count', array_length(file_ids, 1)
  );
  
  IF error_count > 0 THEN
    result := result || jsonb_build_object('errors', errors);
  END IF;
  
  RETURN result;
END;
$$;

-- =====================================================
-- STORAGE TRIGGERS AND AUTOMATION
-- =====================================================

-- Trigger to automatically create thumbnail after media upload
CREATE OR REPLACE FUNCTION public.auto_process_media_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process images
  IF NEW.type = 'image' AND NEW.mime_type LIKE 'image/%' THEN
    -- Queue for thumbnail generation
    PERFORM public.queue_file_processing(
      NEW.id,
      ARRAY['thumbnail', 'optimize']
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_process_media_upload
  AFTER INSERT ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.auto_process_media_upload();

-- Trigger to update storage usage statistics
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update user storage usage in profiles
  UPDATE public.profiles
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'storage_usage',
    COALESCE((
      SELECT SUM(size_bytes)
      FROM public.media_assets
      WHERE uploaded_by = profiles.id
      AND metadata->>'archived' IS DISTINCT FROM 'true'
    ), 0)
  )
  WHERE id = COALESCE(NEW.uploaded_by, OLD.uploaded_by);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_storage_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_storage_usage();

-- =====================================================
-- INDEXES FOR STORAGE TABLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_storage_versions_original_file ON public.storage_versions(original_file_id);
CREATE INDEX IF NOT EXISTS idx_storage_versions_version_number ON public.storage_versions(original_file_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_storage_versions_created_at ON public.storage_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_processing_queue_status ON public.storage_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_storage_processing_queue_type ON public.storage_processing_queue(processing_type);
CREATE INDEX IF NOT EXISTS idx_storage_processing_queue_created_at ON public.storage_processing_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_processing_queue_file_id ON public.storage_processing_queue(file_id);

-- =====================================================
-- RLS POLICIES FOR STORAGE TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.storage_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_processing_queue ENABLE ROW LEVEL SECURITY;

-- Storage versions policies
CREATE POLICY "Storage version owner access" ON public.storage_versions
  FOR SELECT USING (
    auth.is_service_role() OR
    created_by = auth.uid() OR
    auth.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.id = original_file_id
      AND ma.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Storage version create access" ON public.storage_versions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (created_by = auth.uid() OR auth.is_admin())
  );

-- Processing queue policies
CREATE POLICY "Processing queue owner access" ON public.storage_processing_queue
  FOR SELECT USING (
    auth.is_service_role() OR
    auth.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.id = file_id
      AND ma.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Processing queue admin access" ON public.storage_processing_queue
  FOR ALL USING (
    auth.is_service_role() OR
    auth.is_admin()
  );

-- =====================================================
-- STORAGE QUOTA MANAGEMENT
-- =====================================================

-- Function to check storage quota
CREATE OR REPLACE FUNCTION public.check_storage_quota(user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_usage BIGINT;
  quota_limit BIGINT;
  quota_info JSONB;
BEGIN
  -- Get current usage
  SELECT COALESCE(SUM(size_bytes), 0) INTO current_usage
  FROM public.media_assets
  WHERE uploaded_by = user_id
  AND metadata->>'archived' IS DISTINCT FROM 'true';
  
  -- Get quota limit (default 1GB, can be customized per user)
  SELECT COALESCE(
    (metadata->>'storage_quota')::BIGINT,
    1073741824  -- 1GB default
  ) INTO quota_limit
  FROM public.profiles
  WHERE profiles.id = user_id;
  
  quota_info := jsonb_build_object(
    'current_usage', current_usage,
    'quota_limit', quota_limit,
    'usage_percentage', ROUND((current_usage::numeric / quota_limit * 100), 2),
    'available_space', quota_limit - current_usage,
    'is_over_quota', current_usage > quota_limit
  );
  
  RETURN quota_info;
END;
$$;

-- =====================================================
-- STORAGE ANALYTICS
-- =====================================================

-- Function to get storage analytics
CREATE OR REPLACE FUNCTION public.get_storage_analytics(
  time_period TEXT DEFAULT '30d'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_interval INTERVAL;
  analytics JSONB;
BEGIN
  -- Only admins can access storage analytics
  IF NOT auth.is_admin() THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Parse time period
  period_interval := CASE time_period
    WHEN '7d' THEN INTERVAL '7 days'
    WHEN '30d' THEN INTERVAL '30 days'
    WHEN '90d' THEN INTERVAL '90 days'
    WHEN '1y' THEN INTERVAL '1 year'
    ELSE INTERVAL '30 days'
  END;
  
  -- Gather analytics data
  SELECT jsonb_build_object(
    'total_files', COUNT(*),
    'total_size', COALESCE(SUM(size_bytes), 0),
    'by_type', jsonb_object_agg(
      type, 
      jsonb_build_object(
        'count', count,
        'size', size
      )
    )
  ) INTO analytics
  FROM (
    SELECT 
      type,
      COUNT(*) as count,
      SUM(size_bytes) as size
    FROM public.media_assets
    WHERE created_at >= NOW() - period_interval
    AND metadata->>'archived' IS DISTINCT FROM 'true'
    GROUP BY type
  ) t;
  
  RETURN analytics;
END;
$$;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.storage_versions IS 'Version control for media assets with processing status';
COMMENT ON TABLE public.storage_processing_queue IS 'Queue for background media processing tasks';

COMMENT ON FUNCTION public.queue_file_processing(UUID, TEXT[]) IS 'Queues file processing tasks for thumbnails and optimization';
COMMENT ON FUNCTION public.cleanup_old_versions(INTEGER, INTERVAL) IS 'Cleans up old file versions to save storage space';
COMMENT ON FUNCTION public.get_file_metadata(UUID) IS 'Returns comprehensive file metadata including URLs and thumbnails';
COMMENT ON FUNCTION public.bulk_file_operation(UUID[], TEXT, JSONB) IS 'Performs bulk operations on multiple files';
COMMENT ON FUNCTION public.check_storage_quota(UUID) IS 'Checks storage quota usage for a user';
COMMENT ON FUNCTION public.get_storage_analytics(TEXT) IS 'Returns storage analytics for administrators';

-- =====================================================
-- END OF ADVANCED STORAGE CONFIGURATION
-- =====================================================