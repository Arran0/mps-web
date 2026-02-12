-- Fix infinite recursion in announcement RLS policies
-- The issue: announcement_audiences policy references announcements,
-- and announcements policy references announcement_audiences
-- This causes infinite recursion when joining them

-- Drop the problematic student audiences policy
DROP POLICY IF EXISTS "Students can view own announcement audiences" ON public.announcement_audiences;

-- Recreate with a simpler policy that doesn't reference announcements
-- Students can see audience records that match their grade/section
CREATE POLICY "Students can view own announcement audiences"
  ON public.announcement_audiences FOR SELECT
  USING (
    public.get_user_role() = 'student'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND announcement_audiences.grade = p.grade
      AND (announcement_audiences.section IS NULL OR announcement_audiences.section = p.section)
    )
  );

-- Note: The announcements policy will still filter which announcements
-- students can see, so this simpler audiences policy is safe.
