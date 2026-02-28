-- ============================================================
-- STUDENT LEAVE RLS FIX
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Fixes three gaps that prevent students from using the
-- Student Leave Manager:
--
--   1. Students couldn't search for staff (profiles SELECT)
--   2. Students couldn't submit leave applications (INSERT)
--   3. Students couldn't create the linked approval record (INSERT)
-- ============================================================

-- ── 1. Allow students to read staff profiles ──────────────────
--    Required for the "Send To" search bar (searchLeaveRecipients).
--    Only exposes teacher/coordinator/principal rows; students
--    cannot see other students' profiles through this policy.
CREATE POLICY "Students can view staff profiles for leave"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role() = 'student'
    AND role IN ('teacher', 'coordinator', 'principal')
  );

-- ── 2. Allow students to insert leave applications ────────────
DROP POLICY IF EXISTS "Staff can create leave applications" ON public.leave_applications;

CREATE POLICY "Users can create leave applications"
  ON public.leave_applications FOR INSERT
  WITH CHECK (
    applicant_id = auth.uid()
    AND public.get_user_role() IN ('student', 'teacher', 'coordinator', 'principal')
  );

-- ── 3. Allow students to insert the linked approval record ────
DROP POLICY IF EXISTS "Staff can insert leave approvals" ON public.leave_approvals;

CREATE POLICY "Users can insert leave approvals"
  ON public.leave_approvals FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('student', 'teacher', 'coordinator', 'principal', 'admin')
  );

-- ── Reload PostgREST schema cache ─────────────────────────────
NOTIFY pgrst, 'reload schema';
