-- =========================================================
-- AniMaker — CHAT QUICKFIX
-- Fixes "Could not start the chat" when RLS policies are
-- missing or broken. Safe to re-run (fully idempotent).
-- Run the WHOLE file in Supabase Dashboard -> SQL Editor.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Membership function (used by policies; definer = no recursion)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID) TO authenticated;

-- ---------------------------------------------------------
-- 2. Atomic conversation starter (bypasses RLS as definer;
--    reuses an existing 1:1 conversation when one exists)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_start_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID;
  existing UUID;
  new_conv UUID;
BEGIN
  me := auth.uid();
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = me THEN
    RAISE EXCEPTION 'Invalid conversation partner';
  END IF;

  -- Reuse an existing 2-person conversation between the two users
  SELECT cp1.conversation_id INTO existing
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
   AND cp2.user_id = p_other_user_id
  WHERE cp1.user_id = me
  LIMIT 1;

  IF existing IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO new_conv;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (new_conv, me);
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (new_conv, p_other_user_id);
  RETURN new_conv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_start_conversation(UUID) TO authenticated;

-- ---------------------------------------------------------
-- 3. Message sender (verifies membership internally)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_reply_to UUID DEFAULT NULL
)
RETURNS messages
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID;
  msg messages;
BEGIN
  me := auth.uid();
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_conversation_member(p_conversation_id) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  INSERT INTO messages (conversation_id, sender_id, message_type, content, reply_to_message_id)
  VALUES (p_conversation_id, me, 'text', p_content, p_reply_to)
  RETURNING * INTO msg;

  RETURN msg;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_send_message(UUID, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------
-- 4. Table privileges (this project requires explicit GRANTs)
-- ---------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_preferences TO authenticated;

-- ---------------------------------------------------------
-- 5. Re-assert ALL policies (drops + recreates; recursion-free)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
CREATE POLICY "Users can read own conversations"
  ON conversations FOR SELECT USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read own conversation participants" ON conversation_participants;
CREATE POLICY "Users can read own conversation participants"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can add participants to own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can update own participant record" ON conversation_participants;
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own participant record" ON conversation_participants;
CREATE POLICY "Users can delete own participant record"
  ON conversation_participants FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read messages in own conversations" ON messages;
CREATE POLICY "Users can read messages in own conversations"
  ON messages FOR SELECT USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can send messages to own conversations" ON messages;
CREATE POLICY "Users can send messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can read reactions in own conversations" ON message_reactions;
CREATE POLICY "Users can read reactions in own conversations"
  ON message_reactions FOR SELECT USING (EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id)
  ));

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id)
  ));

DROP POLICY IF EXISTS "Users can delete own reactions" ON message_reactions;
CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own chat preferences" ON chat_preferences;
CREATE POLICY "Users can read own chat preferences"
  ON chat_preferences FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own chat preferences" ON chat_preferences;
CREATE POLICY "Users can insert own chat preferences"
  ON chat_preferences FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own chat preferences" ON chat_preferences;
CREATE POLICY "Users can update own chat preferences"
  ON chat_preferences FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own chat preferences" ON chat_preferences;
CREATE POLICY "Users can delete own chat preferences"
  ON chat_preferences FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------
-- 6. Realtime (guarded)
-- ---------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
