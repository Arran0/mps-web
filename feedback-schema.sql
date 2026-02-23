-- ============================================
-- MPS Web - Feedback System Schema
-- Run this in your Supabase SQL Editor
-- ============================================

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
CREATE TRIGGER feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedbacks_submitted_by ON public.feedbacks(submitted_by);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_replied_at ON public.feedbacks(replied_at);

-- Grant access
GRANT ALL ON public.feedbacks TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- STORAGE BUCKET SETUP
-- Do this in Supabase Dashboard > Storage:
--
-- 1. Create a new bucket named: feedback-files
--    - Public: OFF (private bucket)
--
-- 2. Add the following storage policies to the bucket:
--
--    Policy: "Users can upload their own files"
--      Operation: INSERT
--      Using: (auth.uid()::text = (storage.foldername(name))[1])
--
--    Policy: "Users can view their own files"
--      Operation: SELECT
--      Using: (auth.uid()::text = (storage.foldername(name))[1])
--
--    Policy: "Admin can view all files"
--      Operation: SELECT
--      Using: (public.get_user_role() = 'admin')
--
--    Policy: "Admin can delete files"
--      Operation: DELETE
--      Using: (public.get_user_role() = 'admin')
-- ============================================
