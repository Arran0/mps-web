-- ============================================
-- COMPLETE RLS CLEANUP AND FIX
-- ============================================
-- This script completely removes all existing policies and creates fresh ones
-- Run this if you get "policy already exists" errors

-- ============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================

-- Drop ALL classroom_members policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'classroom_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.classroom_members';
    END LOOP;
END $$;

-- Drop ALL classrooms policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'classrooms') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.classrooms';
    END LOOP;
END $$;

-- Drop ALL team_members policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.team_members';
    END LOOP;
END $$;

-- Drop ALL teams policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.teams';
    END LOOP;
END $$;

-- Drop ALL profiles policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: CREATE FRESH POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  TO service_role USING (true)
  WITH CHECK (true);

-- ============================================
-- TEAMS POLICIES
-- ============================================

CREATE POLICY "Staff can create teams"
  ON public.teams FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can view all teams"
  ON public.teams FOR SELECT
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can update teams"
  ON public.teams FOR UPDATE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Admin can delete teams"
  ON public.teams FOR DELETE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

-- ============================================
-- TEAM_MEMBERS POLICIES
-- ============================================

CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can manage team members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- ============================================
-- CLASSROOMS POLICIES
-- ============================================

CREATE POLICY "Members can view classrooms"
  ON public.classrooms FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = classrooms.id
      AND cm.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
    OR created_by = auth.uid()
    OR coordinator_id = auth.uid()
  );

CREATE POLICY "Staff can create classrooms"
  ON public.classrooms FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can update classrooms"
  ON public.classrooms FOR UPDATE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
    OR created_by = auth.uid()
  );

CREATE POLICY "Admin can delete classrooms"
  ON public.classrooms FOR DELETE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

-- ============================================
-- CLASSROOM_MEMBERS POLICIES
-- ============================================

CREATE POLICY "Members can view classroom members"
  ON public.classroom_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR classroom_id IN (
      SELECT c.id
      FROM public.classrooms c
      WHERE c.created_by = auth.uid()
      OR c.coordinator_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Staff can add classroom members"
  ON public.classroom_members FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can remove classroom members"
  ON public.classroom_members FOR DELETE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

-- ============================================
-- REFRESH SCHEMA
-- ============================================

NOTIFY pgrst, 'reload schema';
