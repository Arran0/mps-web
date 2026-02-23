-- ============================================
-- LEAVE RLS FIX - Run in Supabase SQL Editor
-- Fixes 500 errors caused by circular RLS policies
-- between leave_applications and leave_approvals
-- ============================================

-- Step 1: Drop all existing leave policies (both tables)
DROP POLICY IF EXISTS "Users can view own leave applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Approvers can view pending applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Staff can create leave applications" ON public.leave_applications;
DROP POLICY IF EXISTS "System can update leave applications" ON public.leave_applications;
DROP POLICY IF EXISTS "System can insert leave approvals" ON public.leave_applications; -- was on wrong table

DROP POLICY IF EXISTS "Users can view own application approvals" ON public.leave_approvals;
DROP POLICY IF EXISTS "Approvers can view assigned approvals" ON public.leave_approvals;
DROP POLICY IF EXISTS "Approvers can update their approvals" ON public.leave_approvals;
DROP POLICY IF EXISTS "Staff can insert leave approvals" ON public.leave_approvals;

-- Step 2: Helper function to check if a leave_application belongs to current user
-- SECURITY DEFINER bypasses RLS, breaking the circular dependency
CREATE OR REPLACE FUNCTION public.is_own_leave_application(application_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leave_applications
    WHERE id = application_id AND applicant_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 3: Recreate leave_applications policies (NO reference to leave_approvals)
-- Own applications
CREATE POLICY "Users can view own leave applications"
  ON public.leave_applications FOR SELECT
  USING (applicant_id = auth.uid());

-- Approver-level staff see all applications (coordinator/principal/admin)
CREATE POLICY "Approvers can view all leave applications"
  ON public.leave_applications FOR SELECT
  USING (public.get_user_role() IN ('coordinator', 'principal', 'admin'));

-- Staff can create (not admin)
CREATE POLICY "Staff can create leave applications"
  ON public.leave_applications FOR INSERT
  WITH CHECK (
    applicant_id = auth.uid()
    AND public.get_user_role() IN ('teacher', 'coordinator', 'principal')
  );

-- Approver-level staff can update application status
CREATE POLICY "System can update leave applications"
  ON public.leave_applications FOR UPDATE
  USING (public.get_user_role() IN ('coordinator', 'principal', 'admin'));

-- Step 4: Recreate leave_approvals policies (NO reference to leave_applications via RLS)
-- Applicant can see approvals for their own applications (uses SECURITY DEFINER fn)
CREATE POLICY "Users can view own application approvals"
  ON public.leave_approvals FOR SELECT
  USING (public.is_own_leave_application(leave_application_id));

-- Approver can see their own assigned approvals
CREATE POLICY "Approvers can view assigned approvals"
  ON public.leave_approvals FOR SELECT
  USING (
    approver_id = auth.uid()
    OR public.get_user_role() IN ('principal', 'admin')
  );

-- Approvers can update their approval records
CREATE POLICY "Approvers can update their approvals"
  ON public.leave_approvals FOR UPDATE
  USING (
    (approver_id = auth.uid() OR approver_id IS NULL)
    AND (
      (approver_role = 'coordinator' AND public.get_user_role() = 'coordinator')
      OR (approver_role = 'principal' AND public.get_user_role() = 'principal')
      OR (approver_role = 'admin' AND public.get_user_role() = 'admin')
    )
  );

-- Staff can insert approval records when submitting a leave application
CREATE POLICY "Staff can insert leave approvals"
  ON public.leave_approvals FOR INSERT
  WITH CHECK (public.get_user_role() IN ('teacher', 'coordinator', 'principal', 'admin'));

-- Step 5: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
