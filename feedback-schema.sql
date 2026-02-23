-- ============================================
-- MPS Web - Feedback System Schema
-- Run this in your Supabase SQL Editor
-- ============================================
-- This script is fully self-contained and idempotent.
-- It creates:
--   1. The `feedbacks` table with RLS policies
--   2. The `feedback-files` private storage bucket
--   3. Storage access policies for users and admins
-- ============================================

-- ============================================
-- HELPER: update_task_updated_at()
-- Create the shared trigger function if it doesn't exist
-- (It is normally created by the main schema, but we guard
--  here so this file can be run independently.)
-- ============================================
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE: feedbacks
-- ============================================

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  -- File attachment stored in 'feedback-files' storage bucket
  -- file_url stores the storage path (e.g. "{userId}/{uuid}.pdf")
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  -- Admin reply
  reply TEXT,
  replied_by UUID REFERENCES public.profiles(id),
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first so re-runs are safe
DROP POLICY IF EXISTS "Users can view own feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Admin can view all feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.feedbacks;
DROP POLICY IF EXISTS "Admin can reply to feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Admin can delete feedbacks" ON public.feedbacks;

-- Users can view their own feedbacks
CREATE POLICY "Users can view own feedbacks"
  ON public.feedbacks FOR SELECT
  USING (submitted_by = auth.uid());

-- Admin can view all feedbacks
CREATE POLICY "Admin can view all feedbacks"
  ON public.feedbacks FOR SELECT
  USING (public.get_user_role() = 'admin');

-- Any authenticated user can submit feedback (only for themselves)
CREATE POLICY "Authenticated users can submit feedback"
  ON public.feedbacks FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- Admin can update feedbacks (to add/edit reply)
CREATE POLICY "Admin can reply to feedbacks"
  ON public.feedbacks FOR UPDATE
  USING (public.get_user_role() = 'admin');

-- Admin can delete feedbacks
CREATE POLICY "Admin can delete feedbacks"
  ON public.feedbacks FOR DELETE
  USING (public.get_user_role() = 'admin');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS feedbacks_updated_at ON public.feedbacks;
CREATE TRIGGER feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedbacks_submitted_by ON public.feedbacks(submitted_by);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_replied_at ON public.feedbacks(replied_at);

-- Grant access
GRANT ALL ON public.feedbacks TO anon, authenticated;

-- ============================================
-- STORAGE BUCKET: feedback-files
-- ============================================
-- Insert the private bucket (10 MB file size limit).
-- ON CONFLICT ensures re-runs are safe.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('feedback-files', 'feedback-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES for feedback-files bucket
-- ============================================
-- Drop any pre-existing policies so re-runs don't fail
DROP POLICY IF EXISTS "Feedback: users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Feedback: users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Feedback: admin can view all files" ON storage.objects;
DROP POLICY IF EXISTS "Feedback: admin can delete files" ON storage.objects;

-- Users can upload files into their own folder ({userId}/...)
CREATE POLICY "Feedback: users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read files from their own folder
CREATE POLICY "Feedback: users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can read all files in the bucket
CREATE POLICY "Feedback: admin can view all files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback-files'
    AND public.get_user_role() = 'admin'
  );

-- Admins can delete any file in the bucket
CREATE POLICY "Feedback: admin can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'feedback-files'
    AND public.get_user_role() = 'admin'
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
