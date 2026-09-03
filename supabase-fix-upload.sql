-- Simple fix: create 'uploads' bucket and set up clean policies
-- Run this in Supabase SQL Editor

-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Clean policies for uploads bucket
DO $$ BEGIN
  DROP POLICY IF EXISTS "uploads_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "uploads_auth_insert" ON storage.objects;
  DROP POLICY IF EXISTS "uploads_auth_update" ON storage.objects;
  DROP POLICY IF EXISTS "uploads_auth_delete" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "uploads_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

CREATE POLICY "uploads_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "uploads_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'uploads' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "uploads_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
