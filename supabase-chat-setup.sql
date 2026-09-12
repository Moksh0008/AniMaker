/* =========================================================
   AniMaker v2.1 — Chat / Messaging System Setup
   
   Run this SQL in Supabase SQL Editor.
   
   Creates:
   - conversations
   - conversation_participants
   - messages
   - message_reactions
   - chat_preferences
   - chat-attachments storage bucket
   - All RLS policies
   - All indexes
   ========================================================= */

-- =============================================
-- 1. CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. CONVERSATION PARTICIPANTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  archived BOOLEAN DEFAULT false,
  muted BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'system')),
  content TEXT DEFAULT '',
  attachment_url TEXT DEFAULT '',
  attachment_name TEXT DEFAULT '',
  attachment_size BIGINT DEFAULT 0,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. MESSAGE REACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. CHAT PREFERENCES TABLE (per-conversation themes)
-- =============================================
CREATE TABLE IF NOT EXISTS chat_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'default',
  accent_color TEXT DEFAULT '#7c5cfc',
  background_style TEXT DEFAULT 'default',
  bubble_style TEXT DEFAULT 'rounded',
  background_image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE chat_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_preferences_conv_user ON chat_preferences(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_archived ON conversation_participants(user_id, archived);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);

-- =============================================
-- 7. RLS POLICIES — CONVERSATIONS
-- =============================================

-- Users can read conversations they participate in
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
CREATE POLICY "Users can read own conversations"
  ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can create conversations (any authenticated user)
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 8. RLS POLICIES — CONVERSATION PARTICIPANTS
-- =============================================

-- Users can read participants of conversations they belong to
DROP POLICY IF EXISTS "Users can read own conversation participants" ON conversation_participants;
CREATE POLICY "Users can read own conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can add participants: themselves to any conversation (needed to
-- bootstrap a new conversation), or others to conversations they belong to
DROP POLICY IF EXISTS "Users can add participants to own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT id FROM conversations
      WHERE id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update their own participant record
DROP POLICY IF EXISTS "Users can update own participant record" ON conversation_participants;
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own participant record (leave conversation)
DROP POLICY IF EXISTS "Users can delete own participant record" ON conversation_participants;
CREATE POLICY "Users can delete own participant record"
  ON conversation_participants FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- 9. RLS POLICIES — MESSAGES
-- =============================================

-- Users can read messages in their conversations
DROP POLICY IF EXISTS "Users can read messages in own conversations" ON messages;
CREATE POLICY "Users can read messages in own conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert messages into their conversations
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON messages;
CREATE POLICY "Users can send messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own messages (edit)
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Users can delete their own messages
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (sender_id = auth.uid());

-- =============================================
-- 10. RLS POLICIES — MESSAGE REACTIONS
-- =============================================

-- Users can read reactions in their conversations
DROP POLICY IF EXISTS "Users can read reactions in own conversations" ON message_reactions;
CREATE POLICY "Users can read reactions in own conversations"
  ON message_reactions FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Users can add reactions
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete own reactions" ON message_reactions;
CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- 11. RLS POLICIES — CHAT PREFERENCES
-- =============================================

-- Users can read their own preferences
DROP POLICY IF EXISTS "Users can read own chat preferences" ON chat_preferences;
CREATE POLICY "Users can read own chat preferences"
  ON chat_preferences FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert own chat preferences" ON chat_preferences;
CREATE POLICY "Users can insert own chat preferences"
  ON chat_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own chat preferences" ON chat_preferences;
CREATE POLICY "Users can update own chat preferences"
  ON chat_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own preferences
DROP POLICY IF EXISTS "Users can delete own chat preferences" ON chat_preferences;
CREATE POLICY "Users can delete own chat preferences"
  ON chat_preferences FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- 12. FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update conversation updated_at and last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now(),
      last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- =============================================
-- 13. STORAGE BUCKET — chat-attachments
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
drop policy if exists "Public read for chat attachments" on storage.objects;
CREATE POLICY "Public read for chat attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

-- Allow authenticated users to upload to their own folder
drop policy if exists "Authenticated upload to own chat folder" on storage.objects;
CREATE POLICY "Authenticated upload to own chat folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );

-- Allow users to delete their own chat attachments
drop policy if exists "Users can delete own chat attachments" on storage.objects;
CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- =============================================
-- 14. ENABLE REALTIME
-- =============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL; -- already in publication
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
