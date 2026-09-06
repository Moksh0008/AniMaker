-- =========================================================
-- AniMaker — Complete Social & Community System
-- Run this in Supabase SQL Editor
-- =========================================================

-- 1. CREATION LIKES
CREATE TABLE IF NOT EXISTS creation_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id UUID NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_creation_likes_creation ON creation_likes(creation_id);
CREATE INDEX IF NOT EXISTS idx_creation_likes_user ON creation_likes(user_id);

ALTER TABLE creation_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read creation_likes" ON creation_likes;
DROP POLICY IF EXISTS "Insert own creation_like" ON creation_likes;
DROP POLICY IF EXISTS "Delete own creation_like" ON creation_likes;

CREATE POLICY "Public read creation_likes" ON creation_likes FOR SELECT USING (true);
CREATE POLICY "Insert own creation_like" ON creation_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own creation_like" ON creation_likes FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON creation_likes TO authenticated;

-- 2. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id UUID NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_creation ON comments(creation_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comments" ON comments;
DROP POLICY IF EXISTS "Insert own comment" ON comments;
DROP POLICY IF EXISTS "Update own comment" ON comments;
DROP POLICY IF EXISTS "Delete own comment" ON comments;

CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Insert own comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own comment" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete own comment" ON comments FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;

-- 3. COMMENT LIKES
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comment_likes" ON comment_likes;
DROP POLICY IF EXISTS "Insert own comment_like" ON comment_likes;
DROP POLICY IF EXISTS "Delete own comment_like" ON comment_likes;

CREATE POLICY "Public read comment_likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Insert own comment_like" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own comment_like" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON comment_likes TO authenticated;

-- 4. FOLLOWS
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read follows" ON follows;
DROP POLICY IF EXISTS "Insert own follow" ON follows;
DROP POLICY IF EXISTS "Delete own follow" ON follows;

CREATE POLICY "Public read follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Insert own follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Delete own follow" ON follows FOR DELETE USING (auth.uid() = follower_id);

GRANT SELECT, INSERT, DELETE ON follows TO authenticated;

-- 5. SAVED CREATIONS (BOOKMARKS)
CREATE TABLE IF NOT EXISTS saved_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creation_id UUID NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, creation_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_creation ON saved_creations(creation_id);

ALTER TABLE saved_creations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read saved_creations" ON saved_creations;
DROP POLICY IF EXISTS "Insert own save" ON saved_creations;
DROP POLICY IF EXISTS "Delete own save" ON saved_creations;

CREATE POLICY "Public read saved_creations" ON saved_creations FOR SELECT USING (true);
CREATE POLICY "Insert own save" ON saved_creations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own save" ON saved_creations FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON saved_creations TO authenticated;

-- =========================================================
-- FOLLOW COUNT FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION get_follower_count(uid UUID)
RETURNS BIGINT AS $$
  SELECT COUNT(*)::BIGINT FROM follows WHERE following_id = uid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_following_count(uid UUID)
RETURNS BIGINT AS $$
  SELECT COUNT(*)::BIGINT FROM follows WHERE follower_id = uid;
$$ LANGUAGE sql STABLE;

-- 6. Add follower/following columns to profiles if missing
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- =========================================================
-- Done! All tables created with RLS.
-- =========================================================
