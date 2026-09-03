-- =====================================================
-- AniMaker Creations System — Supabase SQL Setup (v2)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- =====================================================

-- 1. Create creations table (with genre + tags)
CREATE TABLE IF NOT EXISTS creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('creator', 'writer', 'maker')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  genre TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  cover_image_url TEXT DEFAULT '',
  media_url TEXT DEFAULT '',
  story_content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns if table already exists (safe migration)
DO $$ BEGIN
  ALTER TABLE creations ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE creations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_creations_user_id ON creations(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_type ON creations(type);
CREATE INDEX IF NOT EXISTS idx_creations_created_at ON creations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creations_genre ON creations(genre);

-- 4. Enable Row Level Security
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON creations TO authenticated;

-- 6. Drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "Creations are publicly viewable" ON creations;
DROP POLICY IF EXISTS "Users can create their own creations" ON creations;
DROP POLICY IF EXISTS "Users can update their own creations" ON creations;
DROP POLICY IF EXISTS "Users can delete their own creations" ON creations;

CREATE POLICY "Creations are publicly viewable"
  ON creations FOR SELECT USING (true);

CREATE POLICY "Users can create their own creations"
  ON creations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creations"
  ON creations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creations"
  ON creations FOR DELETE USING (auth.uid() = user_id);

-- 7. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION handle_creation_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_creation_updated ON creations;
CREATE TRIGGER on_creation_updated
  BEFORE UPDATE ON creations
  FOR EACH ROW
  EXECUTE FUNCTION handle_creation_updated();

-- =====================================================
-- Storage Buckets
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('creations', 'creations', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('maker-videos', 'maker-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('maker-thumbnails', 'maker-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage RLS Policies
-- =====================================================

-- Creations bucket (images)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Creations images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload creations images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own creations images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own creations images" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Creations images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creations');

CREATE POLICY "Users can upload creations images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'creations'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own creations images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'creations'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own creations images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'creations'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Maker videos bucket
DO $$ BEGIN
  DROP POLICY IF EXISTS "Maker videos are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload maker videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own maker videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own maker videos" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Maker videos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'maker-videos');

CREATE POLICY "Users can upload maker videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'maker-videos'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own maker videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'maker-videos'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own maker videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'maker-videos'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Maker thumbnails bucket
DO $$ BEGIN
  DROP POLICY IF EXISTS "Maker thumbnails are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload maker thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own maker thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own maker thumbnails" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Maker thumbnails are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'maker-thumbnails');

CREATE POLICY "Users can upload maker thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'maker-thumbnails'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own maker thumbnails"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'maker-thumbnails'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own maker thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'maker-thumbnails'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- =====================================================
-- Grant storage permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
