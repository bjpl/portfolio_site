-- Storage Buckets Migration
-- Sets up file storage buckets and policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
    ('avatars', 'avatars', true),
    ('project-images', 'project-images', true),
    ('blog-images', 'blog-images', true),
    ('media', 'media', true),
    ('documents', 'documents', false);

-- Avatar storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Project images storage policies
CREATE POLICY "Project images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Admins and editors can upload project images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-images'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Admins and editors can manage project images" ON storage.objects
    FOR ALL USING (
        bucket_id = 'project-images'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Blog images storage policies
CREATE POLICY "Blog images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Authors can upload blog images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'blog-images'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role IN ('admin', 'editor')
            )
        )
    );

CREATE POLICY "Authors can manage their own blog images" ON storage.objects
    FOR ALL USING (
        bucket_id = 'blog-images'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role IN ('admin', 'editor')
            )
        )
    );

-- General media storage policies
CREATE POLICY "Media files are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can manage their own media" ON storage.objects
    FOR ALL USING (
        bucket_id = 'media'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role IN ('admin', 'editor')
            )
        )
    );

-- Documents storage policies (private bucket)
CREATE POLICY "Only authenticated users can access documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Only admins can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can manage documents" ON storage.objects
    FOR ALL USING (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to get public URL for stored files
CREATE OR REPLACE FUNCTION get_public_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
DECLARE
    base_url TEXT;
BEGIN
    SELECT 
        CASE 
            WHEN bucket_id IN ('avatars', 'project-images', 'blog-images', 'media') THEN
                format('%s/storage/v1/object/public/%s/%s', 
                    current_setting('app.supabase_url', true),
                    bucket_name, 
                    file_path)
            ELSE NULL
        END INTO base_url
    FROM storage.buckets 
    WHERE id = bucket_name;
    
    RETURN base_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate signed URL for private files
CREATE OR REPLACE FUNCTION get_signed_url(bucket_name TEXT, file_path TEXT, expires_in INTEGER DEFAULT 3600)
RETURNS TEXT AS $$
BEGIN
    -- This would typically call Supabase's storage API
    -- For now, we'll return a placeholder that should be handled by the application
    RETURN format('signed://%s/%s?expires_in=%s', bucket_name, file_path, expires_in);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle file upload metadata
CREATE OR REPLACE FUNCTION handle_storage_upload()
RETURNS TRIGGER AS $$
DECLARE
    file_info RECORD;
BEGIN
    -- Extract file information
    SELECT 
        NEW.name as filename,
        split_part(NEW.name, '.', -1) as file_extension,
        NEW.metadata->>'size' as file_size,
        NEW.metadata->>'mimetype' as mime_type
    INTO file_info;
    
    -- Insert into media_assets table for tracking
    INSERT INTO media_assets (
        filename,
        original_filename,
        url,
        file_type,
        file_size,
        mime_type,
        storage_path,
        uploaded_by,
        metadata
    ) VALUES (
        file_info.filename,
        file_info.filename,
        get_public_url(NEW.bucket_id, NEW.name),
        file_info.file_extension,
        file_info.file_size::BIGINT,
        file_info.mime_type,
        NEW.name,
        auth.uid(),
        NEW.metadata
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for storage uploads (if supported by Supabase)
-- Note: This trigger might not be available in all Supabase versions
-- CREATE TRIGGER on_storage_upload
--     AFTER INSERT ON storage.objects
--     FOR EACH ROW EXECUTE FUNCTION handle_storage_upload();

-- Create helper function to clean up orphaned storage objects
CREATE OR REPLACE FUNCTION cleanup_orphaned_storage()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- This is a placeholder for cleanup logic
    -- In practice, this would identify and remove storage objects
    -- that are no longer referenced by any database records
    
    -- Delete orphaned media assets
    DELETE FROM media_assets 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
        SELECT 1 FROM blog_posts 
        WHERE featured_image = media_assets.url
        OR media_assets.url = ANY(images)
    )
    AND NOT EXISTS (
        SELECT 1 FROM projects 
        WHERE media_assets.url = ANY(images)
    )
    AND NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE avatar_url = media_assets.url
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;