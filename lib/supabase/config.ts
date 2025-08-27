import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/admin/database';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client for client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Admin client with service role key for server-side operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Database schema definitions
export const TABLES = {
  CONTENT: 'content',
  MEDIA_FILES: 'media_files',
  MEDIA_FOLDERS: 'media_folders',
  CONTENT_VERSIONS: 'content_versions',
  USER_PROFILES: 'user_profiles',
  CONTENT_TAGS: 'content_tags',
  CONTENT_CATEGORIES: 'content_categories',
} as const;

// Row Level Security policies
export const RLS_POLICIES = {
  // Content policies
  CONTENT_SELECT: `
    CREATE POLICY "Users can view published content or own drafts" ON content
    FOR SELECT USING (
      status = 'published' OR 
      auth.uid()::text = author_id OR
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role IN ('admin', 'editor')
      )
    );
  `,
  
  CONTENT_INSERT: `
    CREATE POLICY "Editors and admins can create content" ON content
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role IN ('admin', 'editor')
      ) AND
      author_id = auth.uid()::text
    );
  `,
  
  CONTENT_UPDATE: `
    CREATE POLICY "Users can update own content or admins can update any" ON content
    FOR UPDATE USING (
      auth.uid()::text = author_id OR
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role = 'admin'
      )
    );
  `,
  
  CONTENT_DELETE: `
    CREATE POLICY "Only admins can delete content" ON content
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role = 'admin'
      )
    );
  `,
  
  // Media policies
  MEDIA_SELECT: `
    CREATE POLICY "Authenticated users can view media" ON media_files
    FOR SELECT USING (auth.role() = 'authenticated');
  `,
  
  MEDIA_INSERT: `
    CREATE POLICY "Editors and admins can upload media" ON media_files
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role IN ('admin', 'editor')
      )
    );
  `,
  
  MEDIA_UPDATE: `
    CREATE POLICY "Users can update own media or admins can update any" ON media_files
    FOR UPDATE USING (
      auth.uid()::text = uploaded_by OR
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role = 'admin'
      )
    );
  `,
  
  MEDIA_DELETE: `
    CREATE POLICY "Users can delete own media or admins can delete any" ON media_files
    FOR DELETE USING (
      auth.uid()::text = uploaded_by OR
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role = 'admin'
      )
    );
  `,
} as const;

// Storage bucket configuration
export const STORAGE_BUCKETS = {
  MEDIA: 'media',
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
} as const;

// Storage policies for buckets
export const STORAGE_POLICIES = {
  MEDIA_SELECT: `
    CREATE POLICY "Authenticated users can view media" ON storage.objects 
    FOR SELECT USING (bucket_id = 'media' AND auth.role() = 'authenticated');
  `,
  
  MEDIA_INSERT: `
    CREATE POLICY "Editors and admins can upload media" ON storage.objects 
    FOR INSERT WITH CHECK (
      bucket_id = 'media' AND
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid()::text 
        AND role IN ('admin', 'editor')
      )
    );
  `,
  
  MEDIA_UPDATE: `
    CREATE POLICY "Users can update own media or admins can update any" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'media' AND (
        auth.uid()::text = owner OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_id = auth.uid()::text 
          AND role = 'admin'
        )
      )
    );
  `,
  
  MEDIA_DELETE: `
    CREATE POLICY "Users can delete own media or admins can delete any" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'media' AND (
        auth.uid()::text = owner OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_id = auth.uid()::text 
          AND role = 'admin'
        )
      )
    );
  `,
} as const;

// Real-time subscription configuration
export const REALTIME_CONFIG = {
  CONTENT_CHANNEL: 'content_changes',
  MEDIA_CHANNEL: 'media_changes',
  USER_CHANNEL: 'user_changes',
};

// Helper functions
export const initializeDatabase = async () => {
  try {
    // Create tables if they don't exist
    const { error: schemaError } = await supabaseAdmin.rpc('create_admin_schema');
    if (schemaError) {
      console.error('Error creating database schema:', schemaError);
    }

    // Enable RLS on tables
    const tables = Object.values(TABLES);
    for (const table of tables) {
      await supabaseAdmin.rpc('enable_rls', { table_name: table });
    }

    // Create storage buckets
    for (const bucket of Object.values(STORAGE_BUCKETS)) {
      const { error } = await supabaseAdmin.storage.createBucket(bucket, {
        public: false,
        allowedMimeTypes: bucket === STORAGE_BUCKETS.MEDIA 
          ? ['image/*', 'video/*', 'audio/*', 'application/pdf']
          : undefined,
        fileSizeLimit: bucket === STORAGE_BUCKETS.MEDIA ? 50 * 1024 * 1024 : 10 * 1024 * 1024, // 50MB for media, 10MB for others
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error(`Error creating bucket ${bucket}:`, error);
      }
    }

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
};

// Auth integration helper
export const syncAuth0UserWithSupabase = async (auth0User: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: auth0User.sub,
        email: auth0User.email,
        name: auth0User.name,
        avatar_url: auth0User.picture,
        role: auth0User.role || 'viewer',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error syncing user with Supabase:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in syncAuth0UserWithSupabase:', error);
    return null;
  }
};

// Content management helpers
export const getContentWithAuthor = async (contentId: string) => {
  const { data, error } = await supabase
    .from(TABLES.CONTENT)
    .select(`
      *,
      author:user_profiles(name, email, avatar_url),
      tags:content_tags(name),
      categories:content_categories(name)
    `)
    .eq('id', contentId)
    .single();

  return { data, error };
};

export const getContentList = async (filters: {
  status?: string;
  type?: string;
  author?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  let query = supabase
    .from(TABLES.CONTENT)
    .select(`
      *,
      author:user_profiles(name, email, avatar_url),
      tags:content_tags(name),
      categories:content_categories(name)
    `);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }

  if (filters.author) {
    query = query.eq('author_id', filters.author);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
  }

  query = query
    .order('updated_at', { ascending: false })
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

  const { data, error } = await query;
  return { data, error };
};

// Media management helpers
export const uploadMediaFile = async (file: File, options: {
  folder?: string;
  userId: string;
}) => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  const filePath = options.folder ? `${options.folder}/${fileName}` : fileName;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.MEDIA)
    .upload(filePath, file);

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKETS.MEDIA)
    .getPublicUrl(filePath);

  // Create database record
  const { data, error } = await supabase
    .from(TABLES.MEDIA_FILES)
    .insert({
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' :
            file.type.startsWith('audio/') ? 'audio' : 'document',
      size: file.size,
      mime_type: file.type,
      url: publicUrl,
      path: filePath,
      uploaded_by: options.userId,
      folder_id: options.folder ? await getOrCreateFolder(options.folder, options.userId) : null,
    })
    .select()
    .single();

  return { data, error };
};

export const getOrCreateFolder = async (folderName: string, userId: string): Promise<string | null> => {
  // Check if folder exists
  const { data: existingFolder } = await supabase
    .from(TABLES.MEDIA_FOLDERS)
    .select('id')
    .eq('name', folderName)
    .single();

  if (existingFolder) {
    return existingFolder.id;
  }

  // Create new folder
  const { data: newFolder, error } = await supabase
    .from(TABLES.MEDIA_FOLDERS)
    .insert({
      name: folderName,
      created_by: userId,
    })
    .select('id')
    .single();

  return error ? null : newFolder.id;
};

export default supabase;