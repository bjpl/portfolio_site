-- Database Functions Migration
-- Utility functions for portfolio site

-- Function to get featured projects
CREATE OR REPLACE FUNCTION get_featured_projects(limit_count INTEGER DEFAULT 6)
RETURNS SETOF projects AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM projects
    WHERE status = 'published' AND featured = true
    ORDER BY display_order ASC, created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent blog posts
CREATE OR REPLACE FUNCTION get_recent_posts(limit_count INTEGER DEFAULT 10)
RETURNS SETOF blog_posts AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM blog_posts
    WHERE status = 'published' AND published_at <= NOW()
    ORDER BY published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search blog posts
CREATE OR REPLACE FUNCTION search_blog_posts(
    search_query TEXT,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    post blog_posts,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.*,
        ts_rank(bp.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM blog_posts bp
    WHERE 
        bp.status = 'published' 
        AND bp.published_at <= NOW()
        AND bp.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, bp.published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get posts by tag
CREATE OR REPLACE FUNCTION get_posts_by_tag(
    tag_name TEXT,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS SETOF blog_posts AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM blog_posts
    WHERE 
        status = 'published' 
        AND published_at <= NOW()
        AND tag_name = ANY(tags)
    ORDER BY published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all unique tags
CREATE OR REPLACE FUNCTION get_all_tags()
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        unnest(tags) as tag,
        COUNT(*) as count
    FROM blog_posts
    WHERE status = 'published' AND published_at <= NOW()
    GROUP BY unnest(tags)
    ORDER BY count DESC, tag ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get post with comments
CREATE OR REPLACE FUNCTION get_post_with_comments(post_slug TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'post', to_json(bp.*),
        'author', to_json(p.*),
        'comments', COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'comment', to_json(c.*),
                        'author', json_build_object(
                            'id', cp.id,
                            'full_name', cp.full_name,
                            'avatar_url', cp.avatar_url
                        ),
                        'replies', COALESCE(
                            (
                                SELECT json_agg(
                                    json_build_object(
                                        'comment', to_json(cr.*),
                                        'author', json_build_object(
                                            'id', cpr.id,
                                            'full_name', cpr.full_name,
                                            'avatar_url', cpr.avatar_url
                                        )
                                    )
                                )
                                FROM comments cr
                                JOIN profiles cpr ON cr.author_id = cpr.id
                                WHERE cr.parent_id = c.id AND cr.approved = true
                                ORDER BY cr.created_at ASC
                            ),
                            '[]'::json
                        )
                    )
                )
                FROM comments c
                JOIN profiles cp ON c.author_id = cp.id
                WHERE c.post_id = bp.id AND c.parent_id IS NULL AND c.approved = true
                ORDER BY c.created_at ASC
            ),
            '[]'::json
        )
    ) INTO result
    FROM blog_posts bp
    JOIN profiles p ON bp.author_id = p.id
    WHERE bp.slug = post_slug 
    AND bp.status = 'published' 
    AND bp.published_at <= NOW();
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    default_start_date DATE;
    default_end_date DATE;
BEGIN
    -- Set default date range (last 30 days)
    default_start_date := COALESCE(start_date, CURRENT_DATE - INTERVAL '30 days');
    default_end_date := COALESCE(end_date, CURRENT_DATE);
    
    SELECT json_build_object(
        'total_events', (
            SELECT COUNT(*) 
            FROM analytics_events 
            WHERE created_at::DATE BETWEEN default_start_date AND default_end_date
        ),
        'unique_visitors', (
            SELECT COUNT(DISTINCT COALESCE(user_id::TEXT, ip_address::TEXT))
            FROM analytics_events 
            WHERE created_at::DATE BETWEEN default_start_date AND default_end_date
        ),
        'page_views', (
            SELECT COUNT(*) 
            FROM analytics_events 
            WHERE event_type = 'page_view' 
            AND created_at::DATE BETWEEN default_start_date AND default_end_date
        ),
        'top_pages', (
            SELECT json_agg(
                json_build_object(
                    'page', page_path,
                    'views', views
                )
            )
            FROM (
                SELECT page_path, COUNT(*) as views
                FROM analytics_events 
                WHERE event_type = 'page_view'
                AND created_at::DATE BETWEEN default_start_date AND default_end_date
                GROUP BY page_path
                ORDER BY views DESC
                LIMIT 10
            ) top_pages_subquery
        ),
        'daily_stats', (
            SELECT json_agg(
                json_build_object(
                    'date', date,
                    'events', events,
                    'unique_visitors', unique_visitors
                )
                ORDER BY date
            )
            FROM (
                SELECT 
                    created_at::DATE as date,
                    COUNT(*) as events,
                    COUNT(DISTINCT COALESCE(user_id::TEXT, ip_address::TEXT)) as unique_visitors
                FROM analytics_events 
                WHERE created_at::DATE BETWEEN default_start_date AND default_end_date
                GROUP BY created_at::DATE
            ) daily_stats_subquery
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get portfolio summary
CREATE OR REPLACE FUNCTION get_portfolio_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'projects', (
            SELECT json_agg(to_json(p.*))
            FROM (
                SELECT * FROM projects
                WHERE status = 'published'
                ORDER BY display_order ASC, created_at DESC
            ) p
        ),
        'skills', (
            SELECT json_agg(
                json_build_object(
                    'category', category,
                    'skills', skills
                )
            )
            FROM (
                SELECT 
                    category,
                    json_agg(to_json(s.*) ORDER BY display_order ASC, name ASC) as skills
                FROM skills s
                GROUP BY category
                ORDER BY category
            ) categorized_skills
        ),
        'experience', (
            SELECT json_agg(to_json(e.*))
            FROM (
                SELECT * FROM experiences
                ORDER BY display_order ASC, start_date DESC
            ) e
        ),
        'education', (
            SELECT json_agg(to_json(ed.*))
            FROM (
                SELECT * FROM education
                ORDER BY display_order ASC, start_date DESC
            ) ed
        ),
        'blog_posts', (
            SELECT json_agg(to_json(bp.*))
            FROM (
                SELECT * FROM blog_posts
                WHERE status = 'published' AND published_at <= NOW()
                ORDER BY published_at DESC
                LIMIT 5
            ) bp
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate reading time
CREATE OR REPLACE FUNCTION calculate_reading_time(content TEXT)
RETURNS INTEGER AS $$
DECLARE
    word_count INTEGER;
    reading_time INTEGER;
BEGIN
    -- Count words (approximate)
    word_count := array_length(string_to_array(regexp_replace(content, '<[^>]*>', ' ', 'g'), ' '), 1);
    
    -- Calculate reading time (average 200 words per minute)
    reading_time := GREATEST(1, ROUND(word_count / 200.0));
    
    RETURN reading_time;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate reading time for blog posts
CREATE OR REPLACE FUNCTION update_reading_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reading_time := calculate_reading_time(NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_reading_time_trigger
    BEFORE INSERT OR UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_reading_time();

-- Function to handle comment approval
CREATE OR REPLACE FUNCTION approve_comment(comment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE comments 
    SET approved = true, updated_at = NOW()
    WHERE id = comment_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comment thread
CREATE OR REPLACE FUNCTION get_comment_thread(parent_comment_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH RECURSIVE comment_tree AS (
        -- Base case: start with the parent comment
        SELECT 
            c.*,
            p.full_name as author_name,
            p.avatar_url as author_avatar,
            0 as depth
        FROM comments c
        JOIN profiles p ON c.author_id = p.id
        WHERE c.id = parent_comment_id AND c.approved = true
        
        UNION ALL
        
        -- Recursive case: get all child comments
        SELECT 
            c.*,
            p.full_name as author_name,
            p.avatar_url as author_avatar,
            ct.depth + 1
        FROM comments c
        JOIN profiles p ON c.author_id = p.id
        JOIN comment_tree ct ON c.parent_id = ct.id
        WHERE c.approved = true
    )
    SELECT json_agg(
        json_build_object(
            'comment', to_json(ct.*),
            'depth', depth
        )
        ORDER BY created_at ASC
    ) INTO result
    FROM comment_tree ct;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send newsletter (placeholder for future implementation)
CREATE OR REPLACE FUNCTION send_newsletter(
    subject TEXT,
    content TEXT,
    template_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    subscriber_count INTEGER;
    result JSON;
BEGIN
    -- Count active subscribers
    SELECT COUNT(*) INTO subscriber_count
    FROM newsletter_subscriptions
    WHERE status = 'subscribed';
    
    -- In a real implementation, this would integrate with an email service
    -- For now, we'll just return a summary
    result := json_build_object(
        'success', true,
        'subscriber_count', subscriber_count,
        'subject', subject,
        'sent_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;