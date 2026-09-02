-- ============================================
-- AniMaker Posts System — Supabase SQL
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================

-- 1. Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  thumbnail_url TEXT DEFAULT '',
  category TEXT DEFAULT 'Other',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Foreign key to profiles for Supabase joins
ALTER TABLE posts ADD CONSTRAINT fk_posts_profile FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Index for efficient feed queries
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- 3. Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 4. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO authenticated;

-- 5. RLS Policies

-- Anyone can view all posts (public feed)
CREATE POLICY "Posts are publicly viewable"
  ON posts FOR SELECT USING (true);

-- Authenticated users can create their own posts
CREATE POLICY "Users can create their own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update only their own posts
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete only their own posts
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid() = user_id);

-- 6. Auto-update updated_at
CREATE OR REPLACE FUNCTION handle_post_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_post_updated ON posts;
CREATE TRIGGER on_post_updated
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_updated();

-- 7. Create post-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Grant storage permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- 9. Storage RLS policies for post-media bucket

-- Anyone can view post media
CREATE POLICY "Post media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

-- Authenticated users can upload their own post media
CREATE POLICY "Users can upload their own post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Users can delete their own post media
CREATE POLICY "Users can delete their own post media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
