-- =========================================================
-- AniMaker — Notifications System
-- Run this in Supabase SQL Editor
-- =========================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'like', 'follow', 'comment_like', 'message')),
  creation_id UUID REFERENCES creations(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own notifications read" ON notifications;
DROP POLICY IF EXISTS "Insert notifications" ON notifications;
DROP POLICY IF EXISTS "Update own notifications" ON notifications;
DROP POLICY IF EXISTS "Delete own notifications" ON notifications;

CREATE POLICY "Own notifications read" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Allow 'message' notification type on databases where the table already exists.
-- Safe to re-run.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('comment', 'like', 'follow', 'comment_like', 'message'));

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_from_user_id UUID,
  p_type TEXT,
  p_creation_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_message TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Don't notify yourself
  IF p_user_id = p_from_user_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (user_id, from_user_id, type, creation_id, comment_id, message)
  VALUES (p_user_id, p_from_user_id, p_type, p_creation_id, p_comment_id, p_message)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
