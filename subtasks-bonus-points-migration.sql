-- ============================================================
-- Migration: Add bonus_points column to subtasks
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add bonus_points column (integer, default 0)
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0 NOT NULL;

-- 2. Back-fill existing bonus-tagged subtasks with 1 point
UPDATE public.subtasks
  SET bonus_points = 1
  WHERE tag = 'bonus' AND bonus_points = 0;

-- 3. Widen the tag constraint to also accept null (it already should)
--    Optionally keep tag in sync for legacy code, or ignore tag going forward.
--    No change needed if existing constraint is:
--    CHECK (tag IS NULL OR tag IN ('bonus'))

-- ============================================================
-- Also run this if you need the classroom_files submission_type
-- to support file uploads (from previous migration batch):
-- ============================================================

ALTER TABLE public.classroom_files
  DROP CONSTRAINT IF EXISTS classroom_files_submission_type_check;
ALTER TABLE public.classroom_files
  ADD CONSTRAINT classroom_files_submission_type_check
    CHECK (submission_type IS NULL OR submission_type IN ('text', 'link', 'file'));

ALTER TABLE public.classroom_submissions
  DROP CONSTRAINT IF EXISTS classroom_submissions_submission_type_check;
ALTER TABLE public.classroom_submissions
  ADD CONSTRAINT classroom_submissions_submission_type_check
    CHECK (submission_type IN ('text', 'link', 'file'));
