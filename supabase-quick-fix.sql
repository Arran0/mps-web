-- ============================================
-- MPS Web - QUICK FIX for existing database
-- ============================================
-- Run this if you already ran the old rebuild SQL
-- and are seeing "Database error querying schema"
--
-- This fixes:
-- 1. Self-referencing RLS policy on profiles (circular dependency)
-- 2. All RLS policies to use JWT metadata instead of profiles subquery
-- 3. GRANT permissions for PostgREST
--
-- After running this SQL:
-- 1. Go to Supabase Dashboard → Settings → General → Restart Project
-- 2. Wait for restart to complete
-- 3. Clear browser localStorage (or use Incognito window)
-- 4. Try signing in again
-- ============================================

-- Fix profiles RLS (remove circular self-referencing dependency)
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Fix team_members RLS
DROP POLICY IF EXISTS "Team members manageable by staff" ON public.team_members;
CREATE POLICY "Team members manageable by staff" ON public.team_members
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

-- Fix tasks RLS (all 4 policies)
DROP POLICY IF EXISTS "Tasks viewable by staff" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by staff" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by staff" ON public.tasks;
DROP POLICY IF EXISTS "Tasks deletable by staff" ON public.tasks;

CREATE POLICY "Tasks viewable by staff" ON public.tasks
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );
CREATE POLICY "Tasks insertable by staff" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );
CREATE POLICY "Tasks updatable by staff" ON public.tasks
  FOR UPDATE TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );
CREATE POLICY "Tasks deletable by staff" ON public.tasks
  FOR DELETE TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Fix task_assignees RLS
DROP POLICY IF EXISTS "Task assignees viewable by staff" ON public.task_assignees;
DROP POLICY IF EXISTS "Task assignees manageable by staff" ON public.task_assignees;

CREATE POLICY "Task assignees viewable by staff" ON public.task_assignees
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );
CREATE POLICY "Task assignees manageable by staff" ON public.task_assignees
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Fix checklist RLS
DROP POLICY IF EXISTS "Checklist viewable by staff" ON public.task_checklist_items;
DROP POLICY IF EXISTS "Checklist manageable by staff" ON public.task_checklist_items;

CREATE POLICY "Checklist viewable by staff" ON public.task_checklist_items
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );
CREATE POLICY "Checklist manageable by staff" ON public.task_checklist_items
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Fix comments RLS
DROP POLICY IF EXISTS "Comments viewable by staff" ON public.task_comments;
DROP POLICY IF EXISTS "Comments insertable by staff" ON public.task_comments;

CREATE POLICY "Comments viewable by staff" ON public.task_comments
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );
CREATE POLICY "Comments insertable by staff" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Ensure GRANT permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- DONE! Now restart your Supabase project:
-- Dashboard → Settings → General → Restart Project
-- Then clear browser cache and try signing in.
-- ============================================
