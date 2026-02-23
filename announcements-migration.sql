-- ============================================================
-- Announcement System Migration — rebuild from scratch
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- 1. Add all_students flag to announcement_audiences
ALTER TABLE public.announcement_audiences
  ADD COLUMN IF NOT EXISTS all_students BOOLEAN DEFAULT FALSE;

-- 2. Allow type = 'both' (announcement that targets students AND staff)
ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_type_check;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_type_check
  CHECK (type IN ('student', 'staff', 'both'));

-- ============================================================
-- 3. Drop ALL existing announcement policies
-- ============================================================
DROP POLICY IF EXISTS "Staff can view all announcements"                  ON public.announcements;
DROP POLICY IF EXISTS "Students can view targeted student announcements"   ON public.announcements;
DROP POLICY IF EXISTS "Staff can create announcements"                     ON public.announcements;
DROP POLICY IF EXISTS "Privileged staff can create announcements"          ON public.announcements;
DROP POLICY IF EXISTS "Staff can delete own announcements"                 ON public.announcements;
DROP POLICY IF EXISTS "coord_principal_admin_view_all"                     ON public.announcements;
DROP POLICY IF EXISTS "teachers_view_staff_announcements"                  ON public.announcements;
DROP POLICY IF EXISTS "students_view_student_announcements"                ON public.announcements;
DROP POLICY IF EXISTS "privileged_staff_create_announcements"              ON public.announcements;
DROP POLICY IF EXISTS "delete_own_or_privileged"                           ON public.announcements;

DROP POLICY IF EXISTS "Staff can view announcement audiences"              ON public.announcement_audiences;
DROP POLICY IF EXISTS "Students can view own announcement audiences"       ON public.announcement_audiences;
DROP POLICY IF EXISTS "Staff can insert announcement audiences"            ON public.announcement_audiences;
DROP POLICY IF EXISTS "Staff can delete announcement audiences"            ON public.announcement_audiences;
DROP POLICY IF EXISTS "Privileged staff can insert announcement audiences" ON public.announcement_audiences;
DROP POLICY IF EXISTS "Privileged staff can delete announcement audiences" ON public.announcement_audiences;
DROP POLICY IF EXISTS "Authenticated can view announcement audiences"      ON public.announcement_audiences;
DROP POLICY IF EXISTS "authenticated_view_audiences"                       ON public.announcement_audiences;
DROP POLICY IF EXISTS "privileged_staff_insert_audiences"                  ON public.announcement_audiences;
DROP POLICY IF EXISTS "privileged_staff_delete_audiences"                  ON public.announcement_audiences;

-- ============================================================
-- 4. New announcement visibility policies
-- ============================================================

-- Coordinator / Principal / Admin: see ALL announcements (default audience)
CREATE POLICY "coord_principal_admin_view_all"
  ON public.announcements FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

-- Teacher: sees staff (or 'both') announcements that target their team or all staff
CREATE POLICY "teachers_view_staff_announcements"
  ON public.announcements FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
    AND type IN ('staff', 'both')
    AND EXISTS (
      SELECT 1 FROM public.announcement_audiences aa
      WHERE aa.announcement_id = announcements.id
      AND (
        aa.all_teams = true
        OR aa.team_id IN (
          SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Student: sees student (or 'both') announcements targeting their grade/section
CREATE POLICY "students_view_student_announcements"
  ON public.announcements FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
    AND type IN ('student', 'both')
    AND EXISTS (
      SELECT 1 FROM public.announcement_audiences aa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE aa.announcement_id = announcements.id
      AND (
        aa.all_students = true
        OR (
          aa.grade = p.grade
          AND (aa.section IS NULL OR aa.section = p.section)
        )
      )
    )
  );

-- ============================================================
-- 5. Create/Delete policies
-- ============================================================

-- Only coordinator, principal, admin can create
CREATE POLICY "privileged_staff_create_announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
    AND created_by = auth.uid()
  );

-- Creator can delete own; principal/admin can delete any
CREATE POLICY "delete_own_or_privileged"
  ON public.announcements FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
    OR (
      created_by = auth.uid()
      AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'coordinator'
    )
  );

-- ============================================================
-- 6. announcement_audiences policies
-- ============================================================

-- All authenticated users can read audience rows
-- (visibility is enforced at the announcements level via RLS above)
CREATE POLICY "authenticated_view_audiences"
  ON public.announcement_audiences FOR SELECT
  TO authenticated USING (true);

-- Only coordinator/principal/admin can insert audience rows
CREATE POLICY "privileged_staff_insert_audiences"
  ON public.announcement_audiences FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

-- Only coordinator/principal/admin can delete audience rows
CREATE POLICY "privileged_staff_delete_audiences"
  ON public.announcement_audiences FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );
