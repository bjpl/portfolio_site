-- =====================================================
-- API Helper Functions and Stored Procedures
-- Migration: 20241225000005_api_helpers_procedures.sql
-- =====================================================

-- =====================================================
-- CONTENT MANAGEMENT API HELPERS
-- =====================================================

-- Function to get paginated content with filters
CREATE OR REPLACE FUNCTION public.get_content_paginated(
  content_type TEXT,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20,
  filters JSONB DEFAULT '{}'::jsonb,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'DESC'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_value INTEGER;
  total_count INTEGER;
  content_records JSONB;
  result JSONB;
  base_query TEXT;
  where_clause TEXT := '';
  order_clause TEXT;
  count_query TEXT;
BEGIN
  -- Calculate offset
  offset_value := (page_number - 1) * page_size;
  
  -- Build order clause
  order_clause := format('ORDER BY %I %s', sort_by, sort_order);
  
  -- Build where clause based on filters
  IF filters ? 'status' THEN
    where_clause := where_clause || format(' AND status = %L', filters->>'status');
  END IF;
  
  IF filters ? 'author_id' THEN
    where_clause := where_clause || format(' AND author_id = %L', filters->>'author_id');
  END IF;
  
  IF filters ? 'category' THEN
    where_clause := where_clause || format(' AND category = %L', filters->>'category');
  END IF;
  
  IF filters ? 'search' THEN
    where_clause := where_clause || format(' AND (title ILIKE %L OR content ILIKE %L)', 
      '%' || (filters->>'search') || '%', 
      '%' || (filters->>'search') || '%'
    );
  END IF;
  
  IF filters ? 'date_from' THEN
    where_clause := where_clause || format(' AND created_at >= %L', filters->>'date_from');
  END IF;
  
  IF filters ? 'date_to' THEN
    where_clause := where_clause || format(' AND created_at <= %L', filters->>'date_to');
  END IF;
  
  -- Remove leading 'AND'
  where_clause := LTRIM(where_clause, ' AND');
  IF where_clause <> '' THEN
    where_clause := 'WHERE ' || where_clause;
  END IF;
  
  -- Execute based on content type
  CASE content_type
    WHEN 'blog_posts' THEN
      -- Get total count
      count_query := format('SELECT COUNT(*) FROM public.blog_posts %s', where_clause);
      EXECUTE count_query INTO total_count;
      
      -- Get paginated data
      base_query := format('
        SELECT jsonb_agg(
          jsonb_build_object(
            ''id'', id,
            ''title'', title,
            ''slug'', slug,
            ''excerpt'', excerpt,
            ''content'', content,
            ''status'', status,
            ''featured'', featured,
            ''featured_image'', featured_image,
            ''author_id'', author_id,
            ''reading_time'', reading_time,
            ''view_count'', view_count,
            ''like_count'', like_count,
            ''comment_count'', comment_count,
            ''published_at'', published_at,
            ''created_at'', created_at,
            ''updated_at'', updated_at
          )
        ) FROM (
          SELECT * FROM public.blog_posts %s %s LIMIT %s OFFSET %s
        ) subquery',
        where_clause, order_clause, page_size, offset_value
      );
      
    WHEN 'projects' THEN
      -- Get total count
      count_query := format('SELECT COUNT(*) FROM public.projects %s', where_clause);
      EXECUTE count_query INTO total_count;
      
      -- Get paginated data
      base_query := format('
        SELECT jsonb_agg(
          jsonb_build_object(
            ''id'', id,
            ''title'', title,
            ''slug'', slug,
            ''description'', description,
            ''content'', content,
            ''status'', status,
            ''featured'', featured,
            ''tech_stack'', tech_stack,
            ''images'', images,
            ''github_url'', github_url,
            ''live_url'', live_url,
            ''demo_url'', demo_url,
            ''author_id'', author_id,
            ''view_count'', view_count,
            ''created_at'', created_at,
            ''updated_at'', updated_at
          )
        ) FROM (
          SELECT * FROM public.projects %s %s LIMIT %s OFFSET %s
        ) subquery',
        where_clause, order_clause, page_size, offset_value
      );
      
    WHEN 'pages' THEN
      -- Get total count
      count_query := format('SELECT COUNT(*) FROM public.pages %s', where_clause);
      EXECUTE count_query INTO total_count;
      
      -- Get paginated data
      base_query := format('
        SELECT jsonb_agg(
          jsonb_build_object(
            ''id'', id,
            ''title'', title,
            ''slug'', slug,
            ''content'', content,
            ''status'', status,
            ''visibility'', visibility,
            ''template'', template,
            ''author_id'', author_id,
            ''published_at'', published_at,
            ''created_at'', created_at,
            ''updated_at'', updated_at
          )
        ) FROM (
          SELECT * FROM public.pages %s %s LIMIT %s OFFSET %s
        ) subquery',
        where_clause, order_clause, page_size, offset_value
      );
      
    ELSE
      RAISE EXCEPTION 'Unsupported content type: %', content_type;
  END CASE;
  
  -- Execute query
  EXECUTE base_query INTO content_records;
  
  -- Build result
  result := jsonb_build_object(
    'data', COALESCE(content_records, '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', page_number,
      'page_size', page_size,
      'total_count', total_count,
      'total_pages', CEIL(total_count::numeric / page_size),
      'has_next', (page_number * page_size) < total_count,
      'has_prev', page_number > 1
    )
  );
  
  RETURN result;
END;
$$;

-- Function to get content with relationships
CREATE OR REPLACE FUNCTION public.get_content_with_relationships(
  content_type TEXT,
  content_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  content_record JSONB;
  author_info JSONB;
  categories_info JSONB;
  tags_info JSONB;
  media_info JSONB;
  comments_info JSONB;
  versions_info JSONB;
  result JSONB;
BEGIN
  -- Get main content record
  CASE content_type
    WHEN 'blog_post' THEN
      SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'slug', slug,
        'excerpt', excerpt,
        'content', content,
        'status', status,
        'featured', featured,
        'featured_image', featured_image,
        'author_id', author_id,
        'categories', categories,
        'tags', tags,
        'reading_time', reading_time,
        'view_count', view_count,
        'like_count', like_count,
        'comment_count', comment_count,
        'published_at', published_at,
        'created_at', created_at,
        'updated_at', updated_at
      )
      INTO content_record
      FROM public.blog_posts
      WHERE id = content_id;
      
    WHEN 'project' THEN
      SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'slug', slug,
        'description', description,
        'content', content,
        'status', status,
        'featured', featured,
        'tech_stack', tech_stack,
        'images', images,
        'github_url', github_url,
        'live_url', live_url,
        'demo_url', demo_url,
        'author_id', author_id,
        'category', category,
        'tags', tags,
        'view_count', view_count,
        'created_at', created_at,
        'updated_at', updated_at
      )
      INTO content_record
      FROM public.projects
      WHERE id = content_id;
      
    WHEN 'page' THEN
      SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'slug', slug,
        'content', content,
        'excerpt', excerpt,
        'status', status,
        'visibility', visibility,
        'template', template,
        'author_id', author_id,
        'published_at', published_at,
        'created_at', created_at,
        'updated_at', updated_at
      )
      INTO content_record
      FROM public.pages
      WHERE id = content_id;
      
    ELSE
      RAISE EXCEPTION 'Unsupported content type: %', content_type;
  END CASE;
  
  IF content_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get author information
  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio
  )
  INTO author_info
  FROM public.profiles p
  WHERE p.id = (content_record->>'author_id')::UUID;
  
  -- Get categories (for blog posts that use category arrays)
  IF content_type = 'blog_post' AND content_record ? 'categories' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'color', c.color
      )
    )
    INTO categories_info
    FROM public.categories c
    WHERE c.name = ANY((content_record->>'categories')::TEXT[]);
  END IF;
  
  -- Get tags
  IF content_record ? 'tags' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'color', t.color
      )
    )
    INTO tags_info
    FROM public.tags t
    WHERE t.name = ANY((content_record->>'tags')::TEXT[]);
  END IF;
  
  -- Get media assets (if content has images)
  IF content_record ? 'images' OR content_record ? 'featured_image' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ma.id,
        'filename', ma.filename,
        'url', ma.url,
        'type', ma.type,
        'alt_text', ma.alt_text,
        'caption', ma.caption,
        'width', ma.width,
        'height', ma.height
      )
    )
    INTO media_info
    FROM public.media_assets ma
    WHERE ma.url = ANY(
      COALESCE(
        (content_record->>'images')::TEXT[],
        ARRAY[content_record->>'featured_image']
      )
    );
  END IF;
  
  -- Get comments (for blog posts)
  IF content_type = 'blog_post' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'content', c.content,
        'author_name', c.author_name,
        'author_email', c.author_email,
        'status', c.status,
        'created_at', c.created_at
      )
    )
    INTO comments_info
    FROM public.comments c
    WHERE c.post_id = content_id
    AND c.status = 'approved'
    ORDER BY c.created_at DESC
    LIMIT 10;
  END IF;
  
  -- Get recent versions
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cv.id,
      'version_number', cv.version_number,
      'change_summary', cv.change_summary,
      'created_by', cv.created_by,
      'created_at', cv.created_at
    )
  )
  INTO versions_info
  FROM public.content_versions cv
  WHERE cv.content_type = content_type
  AND cv.content_id = content_id
  ORDER BY cv.version_number DESC
  LIMIT 5;
  
  -- Build result
  result := content_record || jsonb_build_object(
    'author', author_info,
    'categories', COALESCE(categories_info, '[]'::jsonb),
    'tags', COALESCE(tags_info, '[]'::jsonb),
    'media', COALESCE(media_info, '[]'::jsonb),
    'recent_versions', COALESCE(versions_info, '[]'::jsonb)
  );
  
  -- Add comments for blog posts
  IF content_type = 'blog_post' THEN
    result := result || jsonb_build_object('comments', COALESCE(comments_info, '[]'::jsonb));
  END IF;
  
  RETURN result;
END;
$$;

-- =====================================================
-- USER AND AUTHENTICATION HELPERS
-- =====================================================

-- Function to get user profile with roles and permissions
CREATE OR REPLACE FUNCTION public.get_user_profile_complete(user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_data JSONB;
  roles_data JSONB;
  permissions_data JSONB;
  stats_data JSONB;
BEGIN
  -- Get profile data
  SELECT jsonb_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'email', p.email,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'location', p.location,
    'website', p.website,
    'social_links', p.social_links,
    'language_preference', p.language_preference,
    'timezone', p.timezone,
    'email_notifications', p.email_notifications,
    'is_active', p.is_active,
    'last_login', p.last_login,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  INTO profile_data
  FROM public.profiles p
  WHERE p.id = user_id OR p.user_id = user_id;
  
  IF profile_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get roles
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'description', r.description,
      'permissions', r.permissions,
      'granted_at', ur.granted_at,
      'expires_at', ur.expires_at
    )
  )
  INTO roles_data
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = (profile_data->>'id')::UUID
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
  
  -- Aggregate permissions
  SELECT jsonb_object_agg(
    permission_key,
    permission_value
  )
  INTO permissions_data
  FROM (
    SELECT DISTINCT
      jsonb_object_keys(r.permissions) as permission_key,
      r.permissions->(jsonb_object_keys(r.permissions)) as permission_value
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = (profile_data->>'id')::UUID
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) perms;
  
  -- Get user statistics
  SELECT jsonb_build_object(
    'blog_posts_count', (
      SELECT COUNT(*) FROM public.blog_posts
      WHERE author_id = (profile_data->>'id')::UUID
    ),
    'projects_count', (
      SELECT COUNT(*) FROM public.projects
      WHERE author_id = (profile_data->>'id')::UUID
    ),
    'pages_count', (
      SELECT COUNT(*) FROM public.pages
      WHERE author_id = (profile_data->>'id')::UUID
    ),
    'comments_count', (
      SELECT COUNT(*) FROM public.comments
      WHERE author_id = (profile_data->>'id')::UUID
    ),
    'media_assets_count', (
      SELECT COUNT(*) FROM public.media_assets
      WHERE uploaded_by = (profile_data->>'id')::UUID
    )
  ) INTO stats_data;
  
  -- Return complete profile
  RETURN profile_data || jsonb_build_object(
    'roles', COALESCE(roles_data, '[]'::jsonb),
    'permissions', COALESCE(permissions_data, '{}'::jsonb),
    'statistics', stats_data
  );
END;
$$;

-- Function to update user profile with validation
CREATE OR REPLACE FUNCTION public.update_user_profile(
  profile_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile_id UUID;
  updated_profile JSONB;
BEGIN
  -- Get user profile ID
  SELECT id INTO user_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  -- Update profile with validation
  UPDATE public.profiles
  SET
    full_name = COALESCE(profile_data->>'full_name', full_name),
    avatar_url = COALESCE(profile_data->>'avatar_url', avatar_url),
    bio = COALESCE(profile_data->>'bio', bio),
    location = COALESCE(profile_data->>'location', location),
    website = COALESCE(profile_data->>'website', website),
    social_links = COALESCE((profile_data->>'social_links')::jsonb, social_links),
    language_preference = COALESCE(profile_data->>'language_preference', language_preference),
    timezone = COALESCE(profile_data->>'timezone', timezone),
    email_notifications = COALESCE((profile_data->>'email_notifications')::boolean, email_notifications),
    updated_at = NOW()
  WHERE id = user_profile_id
  RETURNING jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'avatar_url', avatar_url,
    'bio', bio,
    'location', location,
    'website', website,
    'social_links', social_links,
    'language_preference', language_preference,
    'timezone', timezone,
    'email_notifications', email_notifications,
    'updated_at', updated_at
  ) INTO updated_profile;
  
  RETURN updated_profile;
END;
$$;

-- =====================================================
-- ANALYTICS AND REPORTING HELPERS
-- =====================================================

-- Function to get comprehensive analytics
CREATE OR REPLACE FUNCTION public.get_analytics_dashboard(
  time_period TEXT DEFAULT '30d',
  user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_interval INTERVAL;
  analytics_data JSONB;
  content_stats JSONB;
  user_stats JSONB;
  traffic_stats JSONB;
BEGIN
  -- Only admins can access full analytics
  IF NOT auth.is_admin() AND user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Parse time period
  period_interval := CASE time_period
    WHEN '7d' THEN INTERVAL '7 days'
    WHEN '30d' THEN INTERVAL '30 days'
    WHEN '90d' THEN INTERVAL '90 days'
    WHEN '1y' THEN INTERVAL '1 year'
    ELSE INTERVAL '30 days'
  END;
  
  -- Get content statistics
  SELECT jsonb_build_object(
    'blog_posts', jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE content_type = 'blog_post'),
      'published', COUNT(*) FILTER (WHERE content_type = 'blog_post' AND status = 'published'),
      'draft', COUNT(*) FILTER (WHERE content_type = 'blog_post' AND status = 'draft')
    ),
    'projects', jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE content_type = 'project'),
      'active', COUNT(*) FILTER (WHERE content_type = 'project' AND status IN ('active', 'featured')),
      'draft', COUNT(*) FILTER (WHERE content_type = 'project' AND status = 'draft')
    ),
    'pages', jsonb_build_object(
      'total', COUNT(*) FILTER (WHERE content_type = 'page'),
      'published', COUNT(*) FILTER (WHERE content_type = 'page' AND status = 'published'),
      'draft', COUNT(*) FILTER (WHERE content_type = 'page' AND status = 'draft')
    )
  )
  INTO content_stats
  FROM (
    SELECT 'blog_post' as content_type, status, created_at FROM public.blog_posts
    WHERE created_at >= NOW() - period_interval
    AND (user_id IS NULL OR author_id = user_id)
    
    UNION ALL
    
    SELECT 'project' as content_type, status, created_at FROM public.projects
    WHERE created_at >= NOW() - period_interval
    AND (user_id IS NULL OR author_id = user_id)
    
    UNION ALL
    
    SELECT 'page' as content_type, status, created_at FROM public.pages
    WHERE created_at >= NOW() - period_interval
    AND (user_id IS NULL OR author_id = user_id)
  ) combined;
  
  -- Get user statistics (admin only)
  IF auth.is_admin() AND user_id IS NULL THEN
    SELECT jsonb_build_object(
      'total_users', COUNT(*),
      'active_users', COUNT(*) FILTER (WHERE is_active = true),
      'new_users', COUNT(*) FILTER (WHERE created_at >= NOW() - period_interval)
    )
    INTO user_stats
    FROM public.profiles;
  ELSE
    user_stats := '{}'::jsonb;
  END IF;
  
  -- Get traffic statistics (admin only)
  IF auth.is_admin() THEN
    SELECT jsonb_build_object(
      'total_sessions', COUNT(DISTINCT session_id),
      'total_page_views', COUNT(*),
      'unique_visitors', COUNT(DISTINCT visitor_id),
      'top_pages', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'page_url', page_url,
            'views', view_count
          )
        )
        FROM (
          SELECT page_url, COUNT(*) as view_count
          FROM public.analytics_events
          WHERE created_at >= NOW() - period_interval
          AND event_type = 'page_view'
          GROUP BY page_url
          ORDER BY view_count DESC
          LIMIT 10
        ) top_pages_data
      )
    )
    INTO traffic_stats
    FROM public.analytics_events
    WHERE created_at >= NOW() - period_interval;
  ELSE
    traffic_stats := '{}'::jsonb;
  END IF;
  
  -- Combine all analytics
  analytics_data := jsonb_build_object(
    'period', time_period,
    'period_start', NOW() - period_interval,
    'period_end', NOW(),
    'content', content_stats,
    'users', user_stats,
    'traffic', traffic_stats
  );
  
  RETURN analytics_data;
END;
$$;

-- =====================================================
-- SEARCH AND DISCOVERY HELPERS
-- =====================================================

-- Function for intelligent content recommendations
CREATE OR REPLACE FUNCTION public.get_content_recommendations(
  content_type TEXT,
  content_id UUID DEFAULT NULL,
  limit_results INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  recommendations JSONB;
  current_content RECORD;
BEGIN
  -- If content_id provided, get similar content
  IF content_id IS NOT NULL THEN
    -- Get current content details for similarity matching
    CASE content_type
      WHEN 'blog_post' THEN
        SELECT * INTO current_content
        FROM public.blog_posts
        WHERE id = content_id AND status = 'published';
        
      WHEN 'project' THEN
        SELECT * INTO current_content
        FROM public.projects
        WHERE id = content_id AND status IN ('active', 'featured');
        
      ELSE
        RAISE EXCEPTION 'Unsupported content type for recommendations: %', content_type;
    END CASE;
    
    IF current_content IS NULL THEN
      RETURN '[]'::jsonb;
    END IF;
  END IF;
  
  -- Get recommendations based on content type
  CASE content_type
    WHEN 'blog_post' THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', bp.id,
          'title', bp.title,
          'slug', bp.slug,
          'excerpt', bp.excerpt,
          'featured_image', bp.featured_image,
          'published_at', bp.published_at,
          'view_count', bp.view_count,
          'reading_time', bp.reading_time,
          'similarity_score', 
            CASE 
              WHEN current_content IS NOT NULL THEN
                -- Calculate similarity based on shared tags and categories
                array_length(
                  (SELECT ARRAY(SELECT unnest(bp.tags) INTERSECT SELECT unnest(current_content.tags))),
                  1
                ) +
                array_length(
                  (SELECT ARRAY(SELECT unnest(bp.categories) INTERSECT SELECT unnest(current_content.categories))),
                  1
                )
              ELSE bp.view_count
            END
        )
      )
      INTO recommendations
      FROM public.blog_posts bp
      WHERE bp.status = 'published'
      AND (content_id IS NULL OR bp.id != content_id)
      ORDER BY 
        CASE 
          WHEN current_content IS NOT NULL THEN
            -- Order by similarity
            array_length(
              (SELECT ARRAY(SELECT unnest(bp.tags) INTERSECT SELECT unnest(current_content.tags))),
              1
            ) +
            array_length(
              (SELECT ARRAY(SELECT unnest(bp.categories) INTERSECT SELECT unnest(current_content.categories))),
              1
            )
          ELSE bp.view_count
        END DESC,
        bp.published_at DESC
      LIMIT limit_results;
      
    WHEN 'project' THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'slug', p.slug,
          'description', p.description,
          'tech_stack', p.tech_stack,
          'images', p.images,
          'github_url', p.github_url,
          'live_url', p.live_url,
          'created_at', p.created_at,
          'view_count', p.view_count,
          'similarity_score',
            CASE 
              WHEN current_content IS NOT NULL THEN
                -- Calculate similarity based on shared technologies
                array_length(
                  (SELECT ARRAY(SELECT unnest(p.tech_stack) INTERSECT SELECT unnest(current_content.tech_stack))),
                  1
                )
              ELSE p.view_count
            END
        )
      )
      INTO recommendations
      FROM public.projects p
      WHERE p.status IN ('active', 'featured')
      AND (content_id IS NULL OR p.id != content_id)
      ORDER BY
        CASE 
          WHEN current_content IS NOT NULL THEN
            array_length(
              (SELECT ARRAY(SELECT unnest(p.tech_stack) INTERSECT SELECT unnest(current_content.tech_stack))),
              1
            )
          ELSE p.view_count
        END DESC,
        p.created_at DESC
      LIMIT limit_results;
      
    ELSE
      RAISE EXCEPTION 'Unsupported content type: %', content_type;
  END CASE;
  
  RETURN COALESCE(recommendations, '[]'::jsonb);
END;
$$;

-- =====================================================
-- BATCH OPERATIONS HELPERS
-- =====================================================

-- Function for batch content operations
CREATE OR REPLACE FUNCTION public.batch_content_operation(
  content_type TEXT,
  content_ids UUID[],
  operation TEXT,
  operation_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  content_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::jsonb;
  result JSONB;
BEGIN
  -- Process each content item
  FOREACH content_id IN ARRAY content_ids
  LOOP
    BEGIN
      CASE operation
        WHEN 'publish' THEN
          CASE content_type
            WHEN 'blog_post' THEN
              UPDATE public.blog_posts
              SET status = 'published', published_at = NOW(), updated_at = NOW()
              WHERE id = content_id AND author_id = auth.uid();
              
            WHEN 'project' THEN
              UPDATE public.projects
              SET status = 'active', updated_at = NOW()
              WHERE id = content_id AND author_id = auth.uid();
              
            WHEN 'page' THEN
              UPDATE public.pages
              SET status = 'published', published_at = NOW(), updated_at = NOW()
              WHERE id = content_id AND author_id = auth.uid();
              
            ELSE
              RAISE EXCEPTION 'Unsupported content type: %', content_type;
          END CASE;
          
        WHEN 'unpublish' THEN
          CASE content_type
            WHEN 'blog_post' THEN
              UPDATE public.blog_posts
              SET status = 'draft', updated_at = NOW()
              WHERE id = content_id AND author_id = auth.uid();
              
            WHEN 'project' THEN
              UPDATE public.projects
              SET status = 'draft', updated_at = NOW()
              WHERE id = content_id AND author_id = auth.uid();
              
            WHEN 'page' THEN
              UPDATE public.pages
              SET status = 'draft', updated_at = NOW()
              WHERE id = content_id AND author_id = auth.uid();
              
          END CASE;
          
        WHEN 'delete' THEN
          CASE content_type
            WHEN 'blog_post' THEN
              DELETE FROM public.blog_posts
              WHERE id = content_id AND author_id = auth.uid();
              
            WHEN 'project' THEN
              DELETE FROM public.projects
              WHERE id = content_id AND author_id = auth.uid();
              
            WHEN 'page' THEN
              DELETE FROM public.pages
              WHERE id = content_id AND author_id = auth.uid();
              
          END CASE;
          
        WHEN 'update_category' THEN
          IF operation_data ? 'category' THEN
            CASE content_type
              WHEN 'blog_post' THEN
                UPDATE public.blog_posts
                SET categories = ARRAY[operation_data->>'category'], updated_at = NOW()
                WHERE id = content_id AND author_id = auth.uid();
                
              WHEN 'project' THEN
                UPDATE public.projects
                SET category = operation_data->>'category', updated_at = NOW()
                WHERE id = content_id AND author_id = auth.uid();
                
            END CASE;
          END IF;
          
        WHEN 'add_tags' THEN
          IF operation_data ? 'tags' THEN
            CASE content_type
              WHEN 'blog_post' THEN
                UPDATE public.blog_posts
                SET tags = array(SELECT DISTINCT unnest(tags || (operation_data->>'tags')::TEXT[])), updated_at = NOW()
                WHERE id = content_id AND author_id = auth.uid();
                
              WHEN 'project' THEN
                UPDATE public.projects
                SET tags = array(SELECT DISTINCT unnest(tags || (operation_data->>'tags')::TEXT[])), updated_at = NOW()
                WHERE id = content_id AND author_id = auth.uid();
                
            END CASE;
          END IF;
          
        ELSE
          RAISE EXCEPTION 'Unsupported operation: %', operation;
      END CASE;
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'content_id', content_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Return results
  result := jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'total_count', array_length(content_ids, 1),
    'operation', operation
  );
  
  IF error_count > 0 THEN
    result := result || jsonb_build_object('errors', errors);
  END IF;
  
  RETURN result;
END;
$$;

-- =====================================================
-- PERFORMANCE OPTIMIZATION HELPERS
-- =====================================================

-- Function to update content statistics
CREATE OR REPLACE FUNCTION public.update_content_statistics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update category counts
  UPDATE public.categories SET
    post_count = (
      SELECT COUNT(*)
      FROM public.blog_posts bp
      WHERE bp.categories @> ARRAY[categories.name]
      AND bp.status = 'published'
    ),
    project_count = (
      SELECT COUNT(*)
      FROM public.projects p
      WHERE p.category = categories.name
      AND p.status IN ('active', 'featured')
    );
  
  -- Update tag usage counts
  UPDATE public.tags SET
    usage_count = (
      SELECT COUNT(*)
      FROM (
        SELECT unnest(tags) as tag_name FROM public.blog_posts WHERE status = 'published'
        UNION ALL
        SELECT unnest(tags) as tag_name FROM public.projects WHERE status IN ('active', 'featured')
      ) t
      WHERE t.tag_name = tags.name
    );
    
  -- Update user content counts in profiles metadata
  UPDATE public.profiles SET
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'content_stats', jsonb_build_object(
        'blog_posts', (
          SELECT COUNT(*) FROM public.blog_posts
          WHERE author_id = profiles.id
        ),
        'projects', (
          SELECT COUNT(*) FROM public.projects
          WHERE author_id = profiles.id
        ),
        'pages', (
          SELECT COUNT(*) FROM public.pages
          WHERE author_id = profiles.id
        )
      )
    );
END;
$$;

-- =====================================================
-- DOCUMENTATION AND COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.get_content_paginated(TEXT, INTEGER, INTEGER, JSONB, TEXT, TEXT) IS 'Gets paginated content with filtering and sorting';
COMMENT ON FUNCTION public.get_content_with_relationships(TEXT, UUID) IS 'Gets content with all related data (author, categories, tags, etc.)';
COMMENT ON FUNCTION public.get_user_profile_complete(UUID) IS 'Gets complete user profile with roles, permissions, and statistics';
COMMENT ON FUNCTION public.update_user_profile(JSONB) IS 'Updates user profile with validation';
COMMENT ON FUNCTION public.get_analytics_dashboard(TEXT, UUID) IS 'Gets comprehensive analytics data for dashboard';
COMMENT ON FUNCTION public.get_content_recommendations(TEXT, UUID, INTEGER) IS 'Gets intelligent content recommendations based on similarity';
COMMENT ON FUNCTION public.batch_content_operation(TEXT, UUID[], TEXT, JSONB) IS 'Performs batch operations on multiple content items';
COMMENT ON FUNCTION public.update_content_statistics() IS 'Updates cached content statistics for performance';

-- =====================================================
-- END OF API HELPERS AND STORED PROCEDURES
-- =====================================================