-- ============================================================
-- Storage bucket setup for classroom-files
-- Run this once in the Supabase SQL Editor
-- ============================================================

-- 1. Create the bucket (public, 20 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('classroom-files', 'classroom-files', true, 20971520, null)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 20971520,
      allowed_mime_types = null;

-- 2. RLS: anyone can read (needed for public URLs to work)
DROP POLICY IF EXISTS "Public read classroom-files" ON storage.objects;
CREATE POLICY "Public read classroom-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'classroom-files');

-- 3. RLS: authenticated users can upload
DROP POLICY IF EXISTS "Auth upload classroom-files" ON storage.objects;
CREATE POLICY "Auth upload classroom-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'classroom-files' AND auth.role() = 'authenticated');

-- 4. RLS: authenticated users can update/overwrite
DROP POLICY IF EXISTS "Auth update classroom-files" ON storage.objects;
CREATE POLICY "Auth update classroom-files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'classroom-files' AND auth.role() = 'authenticated');

-- 5. RLS: authenticated users can delete
DROP POLICY IF EXISTS "Auth delete classroom-files" ON storage.objects;
CREATE POLICY "Auth delete classroom-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'classroom-files' AND auth.role() = 'authenticated');
