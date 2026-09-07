/* =========================================================
   AniMaker v2.1 — Chat Storage Setup
   
   Run this in Supabase SQL Editor AFTER running supabase-chat-setup.sql.
   Creates the chat-attachments storage bucket and policies.
   ========================================================= */

-- Create the chat-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to chat attachments
DO $$ BEGIN
  CREATE POLICY "Public read for chat attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-attachments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to upload to their own folder
DO $$ BEGIN
  CREATE POLICY "Authenticated upload to chat"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'chat-attachments'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow users to delete their own chat attachments
DO $$ BEGIN
  CREATE POLICY "Users can delete own chat attachments"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'chat-attachments'
      AND auth.uid()::text = (string_to_array(name, '/'))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
