-- =====================================================
-- Real-time Subscriptions Configuration
-- Migration: 20241225000004_realtime_subscriptions.sql
-- =====================================================

-- =====================================================
-- REAL-TIME PUBLICATION SETUP
-- =====================================================

-- Drop existing publication if it exists and recreate
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add tables to realtime publication for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- =====================================================
-- COLLABORATIVE EDITING SUPPORT
-- =====================================================

-- Table to track active editing sessions
CREATE TABLE IF NOT EXISTS public.editing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'project', 'page')),
  content_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  cursor_position INTEGER DEFAULT 0,
  selection_start INTEGER DEFAULT 0,
  selection_end INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one active session per user per content
  UNIQUE(content_type, content_id, user_id)
);

-- Table for real-time content changes (operational transforms)
CREATE TABLE IF NOT EXISTS public.content_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'project', 'page')),
  content_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('insert', 'delete', 'retain', 'format')),
  position INTEGER NOT NULL,
  length INTEGER DEFAULT 0,
  content TEXT,
  attributes JSONB DEFAULT '{}',
  parent_operation_id UUID REFERENCES public.content_operations(id),
  sequence_number BIGINT NOT NULL DEFAULT 0,
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking content locks
CREATE TABLE IF NOT EXISTS public.content_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_post', 'project', 'page')),
  content_id UUID NOT NULL,
  locked_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lock_type TEXT DEFAULT 'edit' CHECK (lock_type IN ('edit', 'publish', 'delete')),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Only one lock per content per type
  UNIQUE(content_type, content_id, lock_type)
);

-- Table for real-time notifications
CREATE TABLE IF NOT EXISTS public.realtime_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('mention', 'comment', 'edit', 'publish', 'workflow')),
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT CHECK (entity_type IN ('blog_post', 'project', 'page', 'comment')),
  entity_id UUID,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REAL-TIME FUNCTIONS
-- =====================================================

-- Function to broadcast content changes
CREATE OR REPLACE FUNCTION public.broadcast_content_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  channel_name TEXT;
  payload JSONB;
BEGIN
  -- Determine channel name based on table
  channel_name := TG_TABLE_NAME || '_changes';
  
  -- Build payload
  payload := jsonb_build_object(
    'action', TG_OP,
    'table', TG_TABLE_NAME,
    'id', COALESCE(NEW.id, OLD.id),
    'user_id', auth.uid(),
    'timestamp', NOW()
  );
  
  -- Add changed data for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    payload := payload || jsonb_build_object('changes', 
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  ELSIF TG_OP = 'INSERT' THEN
    payload := payload || jsonb_build_object('record', to_jsonb(NEW));
  END IF;
  
  -- Broadcast to realtime
  PERFORM pg_notify(channel_name, payload::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to manage editing sessions
CREATE OR REPLACE FUNCTION public.start_editing_session(
  content_type TEXT,
  content_id UUID,
  session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_uuid UUID;
  session_record RECORD;
BEGIN
  -- Generate session ID if not provided
  IF session_id IS NULL THEN
    session_id := gen_random_uuid()::text;
  END IF;
  
  -- Insert or update editing session
  INSERT INTO public.editing_sessions (
    content_type,
    content_id,
    user_id,
    session_id,
    last_activity
  ) VALUES (
    start_editing_session.content_type,
    start_editing_session.content_id,
    auth.uid(),
    start_editing_session.session_id,
    NOW()
  )
  ON CONFLICT (content_type, content_id, user_id) DO UPDATE SET
    session_id = EXCLUDED.session_id,
    is_active = true,
    last_activity = NOW(),
    updated_at = NOW()
  RETURNING id INTO session_uuid;
  
  -- Notify other users about the editing session
  PERFORM pg_notify('editing_sessions', jsonb_build_object(
    'action', 'user_joined',
    'content_type', content_type,
    'content_id', content_id,
    'user_id', auth.uid(),
    'session_id', session_id,
    'timestamp', NOW()
  )::text);
  
  RETURN session_uuid;
END;
$$;

-- Function to end editing session
CREATE OR REPLACE FUNCTION public.end_editing_session(
  content_type TEXT,
  content_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update session as inactive
  UPDATE public.editing_sessions
  SET is_active = false, updated_at = NOW()
  WHERE editing_sessions.content_type = end_editing_session.content_type
  AND editing_sessions.content_id = end_editing_session.content_id
  AND user_id = auth.uid();
  
  -- Notify other users
  PERFORM pg_notify('editing_sessions', jsonb_build_object(
    'action', 'user_left',
    'content_type', content_type,
    'content_id', content_id,
    'user_id', auth.uid(),
    'timestamp', NOW()
  )::text);
  
  RETURN TRUE;
END;
$$;

-- Function to apply content operation
CREATE OR REPLACE FUNCTION public.apply_content_operation(
  content_type TEXT,
  content_id UUID,
  operation_type TEXT,
  position INTEGER,
  length INTEGER DEFAULT 0,
  content TEXT DEFAULT NULL,
  attributes JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  operation_id UUID;
  sequence_num BIGINT;
BEGIN
  -- Get next sequence number
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO sequence_num
  FROM public.content_operations
  WHERE content_operations.content_type = apply_content_operation.content_type
  AND content_operations.content_id = apply_content_operation.content_id;
  
  -- Insert operation
  INSERT INTO public.content_operations (
    content_type,
    content_id,
    user_id,
    session_id,
    operation_type,
    position,
    length,
    content,
    attributes,
    sequence_number
  ) VALUES (
    apply_content_operation.content_type,
    apply_content_operation.content_id,
    auth.uid(),
    gen_random_uuid()::text,
    apply_content_operation.operation_type,
    apply_content_operation.position,
    apply_content_operation.length,
    apply_content_operation.content,
    apply_content_operation.attributes,
    sequence_num
  )
  RETURNING id INTO operation_id;
  
  -- Broadcast operation to other users
  PERFORM pg_notify('content_operations', jsonb_build_object(
    'content_type', content_type,
    'content_id', content_id,
    'operation_id', operation_id,
    'user_id', auth.uid(),
    'operation_type', operation_type,
    'position', position,
    'length', length,
    'content', content,
    'attributes', attributes,
    'sequence_number', sequence_num,
    'timestamp', NOW()
  )::text);
  
  RETURN operation_id;
END;
$$;

-- Function to acquire content lock
CREATE OR REPLACE FUNCTION public.acquire_content_lock(
  content_type TEXT,
  content_id UUID,
  lock_type TEXT DEFAULT 'edit',
  duration INTERVAL DEFAULT INTERVAL '30 minutes'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lock_id UUID;
BEGIN
  -- Try to acquire lock
  INSERT INTO public.content_locks (
    content_type,
    content_id,
    locked_by,
    lock_type,
    expires_at
  ) VALUES (
    acquire_content_lock.content_type,
    acquire_content_lock.content_id,
    auth.uid(),
    acquire_content_lock.lock_type,
    NOW() + duration
  )
  ON CONFLICT (content_type, content_id, lock_type) DO UPDATE SET
    locked_by = auth.uid(),
    expires_at = NOW() + duration,
    created_at = NOW()
  WHERE content_locks.expires_at < NOW() OR content_locks.locked_by = auth.uid()
  RETURNING id INTO lock_id;
  
  IF lock_id IS NOT NULL THEN
    -- Notify about lock acquisition
    PERFORM pg_notify('content_locks', jsonb_build_object(
      'action', 'acquired',
      'content_type', content_type,
      'content_id', content_id,
      'lock_type', lock_type,
      'locked_by', auth.uid(),
      'expires_at', NOW() + duration,
      'timestamp', NOW()
    )::text);
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Function to release content lock
CREATE OR REPLACE FUNCTION public.release_content_lock(
  content_type TEXT,
  content_id UUID,
  lock_type TEXT DEFAULT 'edit'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.content_locks
  WHERE content_locks.content_type = release_content_lock.content_type
  AND content_locks.content_id = release_content_lock.content_id
  AND content_locks.lock_type = release_content_lock.lock_type
  AND locked_by = auth.uid();
  
  IF FOUND THEN
    -- Notify about lock release
    PERFORM pg_notify('content_locks', jsonb_build_object(
      'action', 'released',
      'content_type', content_type,
      'content_id', content_id,
      'lock_type', lock_type,
      'locked_by', auth.uid(),
      'timestamp', NOW()
    )::text);
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Function to send real-time notification
CREATE OR REPLACE FUNCTION public.send_realtime_notification(
  recipient_id UUID,
  notification_type TEXT,
  title TEXT,
  message TEXT DEFAULT NULL,
  entity_type TEXT DEFAULT NULL,
  entity_id UUID DEFAULT NULL,
  action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert notification
  INSERT INTO public.realtime_notifications (
    recipient_id,
    sender_id,
    notification_type,
    title,
    message,
    entity_type,
    entity_id,
    action_url
  ) VALUES (
    send_realtime_notification.recipient_id,
    auth.uid(),
    send_realtime_notification.notification_type,
    send_realtime_notification.title,
    send_realtime_notification.message,
    send_realtime_notification.entity_type,
    send_realtime_notification.entity_id,
    send_realtime_notification.action_url
  )
  RETURNING id INTO notification_id;
  
  -- Broadcast to recipient
  PERFORM pg_notify('user_notifications_' || recipient_id::text, jsonb_build_object(
    'id', notification_id,
    'type', notification_type,
    'title', title,
    'message', message,
    'entity_type', entity_type,
    'entity_id', entity_id,
    'action_url', action_url,
    'sender_id', auth.uid(),
    'timestamp', NOW()
  )::text);
  
  RETURN notification_id;
END;
$$;

-- =====================================================
-- REAL-TIME TRIGGERS
-- =====================================================

-- Add real-time triggers to content tables
CREATE TRIGGER realtime_blog_posts_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_content_change();

CREATE TRIGGER realtime_projects_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_content_change();

CREATE TRIGGER realtime_pages_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_content_change();

CREATE TRIGGER realtime_comments_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_content_change();

CREATE TRIGGER realtime_media_assets_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_content_change();

-- Trigger to clean up expired editing sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark sessions as inactive if no activity for 5 minutes
  UPDATE public.editing_sessions
  SET is_active = false
  WHERE last_activity < NOW() - INTERVAL '5 minutes'
  AND is_active = true;
  
  -- Clean up old operations (older than 24 hours)
  DELETE FROM public.content_operations
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Clean up expired locks
  DELETE FROM public.content_locks
  WHERE expires_at < NOW();
  
  RETURN NULL;
END;
$$;

-- Trigger to update session activity
CREATE OR REPLACE FUNCTION public.update_session_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update last_activity for editing sessions
  UPDATE public.editing_sessions
  SET last_activity = NOW()
  WHERE content_type = TG_TABLE_NAME
  AND content_id = NEW.id
  AND user_id = auth.uid()
  AND is_active = true;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_session_activity_blog_posts
  AFTER UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_session_activity();

CREATE TRIGGER update_session_activity_projects
  AFTER UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_session_activity();

CREATE TRIGGER update_session_activity_pages
  AFTER UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_session_activity();

-- =====================================================
-- PERIODIC CLEANUP
-- =====================================================

-- Create a function for periodic cleanup (to be called by cron)
CREATE OR REPLACE FUNCTION public.periodic_realtime_cleanup()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up old editing sessions
  DELETE FROM public.editing_sessions
  WHERE updated_at < NOW() - INTERVAL '1 day'
  AND is_active = false;
  
  -- Clean up old content operations
  DELETE FROM public.content_operations
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Clean up expired content locks
  DELETE FROM public.content_locks
  WHERE expires_at < NOW();
  
  -- Clean up old notifications
  DELETE FROM public.realtime_notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND is_read = true;
END;
$$;

-- =====================================================
-- INDEXES FOR REAL-TIME TABLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_editing_sessions_content ON public.editing_sessions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_editing_sessions_user ON public.editing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_editing_sessions_active ON public.editing_sessions(is_active, last_activity);

CREATE INDEX IF NOT EXISTS idx_content_operations_content ON public.content_operations(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_operations_sequence ON public.content_operations(content_type, content_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_content_operations_user ON public.content_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_content_operations_created_at ON public.content_operations(created_at);

CREATE INDEX IF NOT EXISTS idx_content_locks_content ON public.content_locks(content_type, content_id, lock_type);
CREATE INDEX IF NOT EXISTS idx_content_locks_user ON public.content_locks(locked_by);
CREATE INDEX IF NOT EXISTS idx_content_locks_expires ON public.content_locks(expires_at);

CREATE INDEX IF NOT EXISTS idx_realtime_notifications_recipient ON public.realtime_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_realtime_notifications_unread ON public.realtime_notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_realtime_notifications_created_at ON public.realtime_notifications(created_at DESC);

-- =====================================================
-- RLS POLICIES FOR REAL-TIME TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.editing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_notifications ENABLE ROW LEVEL SECURITY;

-- Editing sessions policies
CREATE POLICY "Users can view editing sessions for content they can access" ON public.editing_sessions
  FOR SELECT USING (
    auth.is_service_role() OR
    user_id = auth.uid() OR
    auth.is_content_owner(content_type, content_id) OR
    auth.is_admin_or_editor()
  );

CREATE POLICY "Users can manage their own editing sessions" ON public.editing_sessions
  FOR ALL USING (
    auth.is_service_role() OR
    user_id = auth.uid() OR
    auth.is_admin()
  );

-- Content operations policies
CREATE POLICY "Users can view operations for content they can access" ON public.content_operations
  FOR SELECT USING (
    auth.is_service_role() OR
    user_id = auth.uid() OR
    auth.is_content_owner(content_type, content_id) OR
    auth.is_admin_or_editor()
  );

CREATE POLICY "Users can create operations for content they can edit" ON public.content_operations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    (
      auth.is_content_owner(content_type, content_id) OR
      auth.is_admin_or_editor()
    )
  );

-- Content locks policies
CREATE POLICY "Users can view locks for content they can access" ON public.content_locks
  FOR SELECT USING (
    auth.is_service_role() OR
    locked_by = auth.uid() OR
    auth.is_content_owner(content_type, content_id) OR
    auth.is_admin_or_editor()
  );

CREATE POLICY "Users can manage locks for content they can edit" ON public.content_locks
  FOR ALL USING (
    auth.is_service_role() OR
    locked_by = auth.uid() OR
    auth.is_admin()
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.realtime_notifications
  FOR SELECT USING (
    auth.is_service_role() OR
    recipient_id = auth.uid()
  );

CREATE POLICY "Users can update their own notifications" ON public.realtime_notifications
  FOR UPDATE USING (
    recipient_id = auth.uid()
  ) WITH CHECK (
    recipient_id = auth.uid()
  );

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.editing_sessions IS 'Tracks active editing sessions for collaborative editing';
COMMENT ON TABLE public.content_operations IS 'Stores operational transforms for real-time collaborative editing';
COMMENT ON TABLE public.content_locks IS 'Manages content locks to prevent editing conflicts';
COMMENT ON TABLE public.realtime_notifications IS 'Real-time notifications for users';

COMMENT ON FUNCTION public.start_editing_session(TEXT, UUID, TEXT) IS 'Starts a collaborative editing session';
COMMENT ON FUNCTION public.end_editing_session(TEXT, UUID) IS 'Ends a collaborative editing session';
COMMENT ON FUNCTION public.apply_content_operation(TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT, JSONB) IS 'Applies an operational transform for collaborative editing';
COMMENT ON FUNCTION public.acquire_content_lock(TEXT, UUID, TEXT, INTERVAL) IS 'Acquires a lock on content to prevent conflicts';
COMMENT ON FUNCTION public.release_content_lock(TEXT, UUID, TEXT) IS 'Releases a content lock';
COMMENT ON FUNCTION public.send_realtime_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) IS 'Sends a real-time notification to a user';
COMMENT ON FUNCTION public.periodic_realtime_cleanup() IS 'Cleans up old real-time data (run via cron)';

-- =====================================================
-- END OF REAL-TIME SUBSCRIPTIONS CONFIGURATION
-- =====================================================