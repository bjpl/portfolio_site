-- Triggers Migration
-- Audit logging and automated actions

-- Create audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES profiles(id),
    user_email TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Generic audit logging function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_values JSONB := NULL;
    new_values JSONB := NULL;
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    -- Get current user information
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email 
        FROM profiles 
        WHERE id = current_user_id;
    END IF;
    
    -- Handle different operations
    IF TG_OP = 'DELETE' THEN
        old_values := to_jsonb(OLD);
        
        INSERT INTO audit_logs (
            table_name, record_id, action, old_values, 
            user_id, user_email, created_at
        ) VALUES (
            TG_TABLE_NAME, OLD.id, TG_OP, old_values,
            current_user_id, current_user_email, NOW()
        );
        
        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
        
        -- Identify changed fields
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(old_values) old_kv
        WHERE old_kv.value IS DISTINCT FROM (new_values -> old_kv.key);
        
        -- Only log if there are actual changes
        IF array_length(changed_fields, 1) > 0 THEN
            INSERT INTO audit_logs (
                table_name, record_id, action, old_values, new_values, 
                changed_fields, user_id, user_email, created_at
            ) VALUES (
                TG_TABLE_NAME, NEW.id, TG_OP, old_values, new_values,
                changed_fields, current_user_id, current_user_email, NOW()
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'INSERT' THEN
        new_values := to_jsonb(NEW);
        
        INSERT INTO audit_logs (
            table_name, record_id, action, new_values,
            user_id, user_email, created_at
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP, new_values,
            current_user_id, current_user_email, NOW()
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_projects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_blog_posts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_comments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Notification system
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    recipient_id UUID,
    title TEXT,
    message TEXT,
    notification_type TEXT DEFAULT 'info',
    action_url TEXT DEFAULT NULL,
    metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        recipient_id, title, message, type, action_url, metadata
    ) VALUES (
        recipient_id, title, message, notification_type, action_url, metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new comment notifications
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    post_title TEXT;
    commenter_name TEXT;
BEGIN
    -- Get post author and title
    SELECT author_id, title INTO post_author_id, post_title
    FROM blog_posts
    WHERE id = NEW.post_id;
    
    -- Get commenter name
    SELECT full_name INTO commenter_name
    FROM profiles
    WHERE id = NEW.author_id;
    
    -- Don't notify if author is commenting on their own post
    IF post_author_id != NEW.author_id THEN
        PERFORM create_notification(
            post_author_id,
            'New Comment',
            format('%s commented on your post "%s"', commenter_name, post_title),
            'info',
            format('/blog/%s#comment-%s', 
                (SELECT slug FROM blog_posts WHERE id = NEW.post_id), 
                NEW.id
            ),
            json_build_object(
                'comment_id', NEW.id,
                'post_id', NEW.post_id,
                'commenter_id', NEW.author_id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER new_comment_notification_trigger
    AFTER INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION notify_new_comment();

-- Trigger for contact message notifications
CREATE OR REPLACE FUNCTION notify_new_contact_message()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get admin user(s)
    FOR admin_id IN 
        SELECT id FROM profiles WHERE role = 'admin'
    LOOP
        PERFORM create_notification(
            admin_id,
            'New Contact Message',
            format('New message from %s (%s)', NEW.name, NEW.email),
            'info',
            '/admin/messages',
            json_build_object(
                'message_id', NEW.id,
                'sender_name', NEW.name,
                'sender_email', NEW.email
            )
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER new_contact_message_notification_trigger
    AFTER INSERT ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_contact_message();

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET read = true, read_at = NOW()
    WHERE id = notification_id 
    AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET read = true, read_at = NOW()
    WHERE recipient_id = auth.uid() 
    AND read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic cleanup triggers
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Clean up old analytics events (keep 1 year)
    DELETE FROM analytics_events 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Clean up old audit logs (keep 6 months)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Clean up read notifications older than 30 days
    DELETE FROM notifications 
    WHERE read = true 
    AND read_at < NOW() - INTERVAL '30 days';
    
    -- Clean up unread notifications older than 90 days
    DELETE FROM notifications 
    WHERE read = false 
    AND created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old unconfirmed newsletter subscriptions
    DELETE FROM newsletter_subscriptions 
    WHERE status = 'subscribed' 
    AND confirmed_at IS NULL 
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting trigger for contact messages
CREATE OR REPLACE FUNCTION check_contact_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    -- Check for rate limiting (max 5 messages per hour from same IP)
    SELECT COUNT(*) INTO recent_count
    FROM contact_messages
    WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (
        email = NEW.email 
        OR (metadata->>'ip_address') = (NEW.metadata->>'ip_address')
    );
    
    IF recent_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending another message.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_rate_limit_trigger
    BEFORE INSERT ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION check_contact_rate_limit();

-- Spam detection for comments
CREATE OR REPLACE FUNCTION detect_spam_comment()
RETURNS TRIGGER AS $$
DECLARE
    spam_keywords TEXT[] := ARRAY['viagra', 'casino', 'lottery', 'crypto', 'bitcoin'];
    keyword TEXT;
    recent_comments INTEGER;
BEGIN
    -- Check for spam keywords
    FOREACH keyword IN ARRAY spam_keywords
    LOOP
        IF LOWER(NEW.content) LIKE '%' || keyword || '%' THEN
            NEW.is_spam := true;
            NEW.approved := false;
        END IF;
    END LOOP;
    
    -- Check for comment flooding (same user posting multiple comments quickly)
    SELECT COUNT(*) INTO recent_comments
    FROM comments
    WHERE author_id = NEW.author_id
    AND created_at > NOW() - INTERVAL '5 minutes';
    
    IF recent_comments >= 3 THEN
        NEW.is_spam := true;
        NEW.approved := false;
    END IF;
    
    -- Auto-approve comments from trusted users (admins/editors)
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = NEW.author_id 
        AND role IN ('admin', 'editor')
    ) THEN
        NEW.approved := true;
        NEW.is_spam := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spam_detection_trigger
    BEFORE INSERT OR UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION detect_spam_comment();

-- Enable RLS on audit and notification tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit logs (admin only)
CREATE POLICY "Only admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());