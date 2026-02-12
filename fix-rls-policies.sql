-- ============================================
-- FIX RLS POLICY ISSUES
-- ============================================

-- ISSUE 1: Fix infinite recursion in classroom_members SELECT policy
-- The problem: Policy references classroom_members table while being defined ON classroom_members
-- Solution: Remove the recursive check - users can view members of classrooms they belong to
-- by checking via the classrooms table instead

DROP POLICY IF EXISTS "Members can view classroom members" ON public.classroom_members;

CREATE POLICY "Members can view classroom members"
  ON public.classroom_members FOR SELECT
  TO authenticated USING (
    -- User can see their own membership
    user_id = auth.uid()
    -- Or user can see members of classrooms they have access to (via classrooms table, not classroom_members)
    OR classroom_id IN (
      SELECT c.id
      FROM public.classrooms c
      WHERE c.created_by = auth.uid()
      OR c.coordinator_id = auth.uid()
    )
    -- Or if user is admin/principal (always have access)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

-- ISSUE 2: Fix profiles table RLS (406 errors when fetching profiles)
-- The profiles table needs proper RLS policies

-- First, enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create comprehensive policies for profiles
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

-- ISSUE 3: Fix teams RLS (403 errors when creating teams)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;

-- Recreate with proper permissions
CREATE POLICY "Staff can create teams"
  ON public.teams FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Team members can view teams"
  ON public.teams FOR SELECT
  TO authenticated USING (
    -- User is a member of the team
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
      AND tm.user_id = auth.uid()
    )
    -- Or user is admin/principal
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
    -- Or user created the team
    OR created_by = auth.uid()
  );

CREATE POLICY "Team owners can update teams"
  ON public.teams FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Team owners can delete teams"
  ON public.teams FOR DELETE
  TO authenticated USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

-- Ensure team_members has proper policies too
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view membership" ON public.team_members;
DROP POLICY IF EXISTS "Staff can manage team members" ON public.team_members;

CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Staff can manage team members"
  ON public.team_members FOR ALL
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- ISSUE 4: Fix classrooms RLS (ensure proper policies exist)
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Drop and recreate classroom policies to ensure they work
DROP POLICY IF EXISTS "Members can view classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Staff can create classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Staff can update classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Admin can delete classrooms" ON public.classrooms;

CREATE POLICY "Members can view classrooms"
  ON public.classrooms FOR SELECT
  TO authenticated USING (
    -- User is a member of the classroom
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = classrooms.id
      AND cm.user_id = auth.uid()
    )
    -- Or user is principal/admin (can view all)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
    -- Or user created the classroom
    OR created_by = auth.uid()
    -- Or user is the coordinator
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

-- Fix classroom_members INSERT policy
DROP POLICY IF EXISTS "Staff can manage classroom members" ON public.classroom_members;
DROP POLICY IF EXISTS "Staff can remove classroom members" ON public.classroom_members;

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

-- Refresh schema
NOTIFY pgrst, 'reload schema';
