-- ============================================
-- MPS Web - Database Schema Only (NO USERS)
-- Run this in your Supabase SQL Editor
-- ============================================
--
-- IMPORTANT: This creates ONLY the database schema.
-- It does NOT create test users (that must be done via UI or API).
--
-- After running this SQL:
-- 1. Go to Settings → General → Restart Project
-- 2. Create users manually (see MANUAL-USER-CREATION.md)
-- 3. Then try signing in
-- ============================================

-- ============================================
-- STEP 0: CLEAN WIPE (drop everything)
-- ============================================
-- Drop tables first (CASCADE will auto-drop their triggers)
DROP TABLE IF EXISTS public.subtasks CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.task_checklist_items CASCADE;
DROP TABLE IF EXISTS public.task_assignees CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop trigger on auth.users (safe even if trigger doesn't exist)
DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_task_updated_at();

-- Grant schema access to Supabase roles (required for PostgREST)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- ============================================
-- PART 1: PROFILES TABLE + RLS + TRIGGERS
-- ============================================

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'coordinator', 'principal', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any user can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Staff can view ALL profiles (uses JWT metadata - NO circular dependency)
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ============================================
-- PART 2: TEAMS
-- ============================================

CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by authenticated" ON public.teams
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- PART 3: TEAM MEMBERS
-- ============================================

CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members viewable by authenticated" ON public.team_members
  FOR SELECT TO authenticated USING (true);

-- Uses JWT metadata instead of profiles subquery
CREATE POLICY "Team members manageable by staff" ON public.team_members
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

-- ============================================
-- PART 4: TASKS
-- ============================================

CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_done' CHECK (status IN ('not_done', 'partial', 'done', 'checked')),
  is_overdue BOOLEAN DEFAULT FALSE,
  due_date DATE,
  timing TEXT,
  tag TEXT CHECK (tag IS NULL OR tag IN ('bonus')),
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- All task RLS uses JWT metadata (no profiles subquery)
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

-- ============================================
-- PART 5: TASK ASSIGNEES
-- ============================================

CREATE TABLE public.task_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task assignees viewable by staff" ON public.task_assignees
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Task assignees manageable by staff" ON public.task_assignees
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- ============================================
-- PART 6: TASK CHECKLIST ITEMS
-- ============================================

CREATE TABLE public.task_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checklist viewable by staff" ON public.task_checklist_items
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Checklist manageable by staff" ON public.task_checklist_items
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- ============================================
-- PART 7: TASK COMMENTS
-- ============================================

CREATE TABLE public.task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by staff" ON public.task_comments
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Comments insertable by staff" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- ============================================
-- PART 8: INDEXES & TRIGGERS
-- ============================================

CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX idx_task_checklist_task_id ON public.task_checklist_items(task_id);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- Grant access on all tables just created
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- PART 9: CREATE TEAMS (optional seed data)
-- ============================================

INSERT INTO public.teams (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Team A'),
  ('a0000000-0000-0000-0000-000000000002', 'Team B'),
  ('a0000000-0000-0000-0000-000000000003', 'Team C')
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 10: PROJECTS
-- ============================================

CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  sequential_mode BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable by staff" ON public.projects
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Projects manageable by coordinators+" ON public.projects
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

CREATE TABLE public.project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members viewable by staff" ON public.project_members
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Project members manageable by coordinators+" ON public.project_members
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

CREATE TABLE public.subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_done' CHECK (status IN ('not_done', 'partial', 'done', 'checked')),
  due_date DATE,
  timing TEXT,
  tag TEXT CHECK (tag IS NULL OR tag IN ('bonus')),
  assignee_id UUID REFERENCES public.profiles(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subtasks viewable by staff" ON public.subtasks
  FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Subtasks manageable by staff" ON public.subtasks
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Indexes for project tables
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_subtasks_project_id ON public.subtasks(project_id);
CREATE INDEX idx_subtasks_assignee_id ON public.subtasks(assignee_id);
CREATE INDEX idx_subtasks_due_date ON public.subtasks(due_date);

-- Triggers for updated_at (reuse update_task_updated_at function)
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

CREATE TRIGGER subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- Grant access on new tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- PART 11: STUDENT PROFILES - GRADE & SECTION
-- ============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section TEXT;

-- ============================================
-- PART 12: ANNOUNCEMENTS
-- ============================================

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('student', 'staff')),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement audiences table
-- For student announcements: grade + section (section NULL = all sections)
-- For staff announcements: team_id (specific team) or all_teams = true
CREATE TABLE IF NOT EXISTS public.announcement_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  grade INTEGER,
  section TEXT,
  team_id UUID REFERENCES public.teams(id),
  all_teams BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_audiences ENABLE ROW LEVEL SECURITY;

-- Announcements policies
-- Staff can view all announcements
CREATE POLICY "Staff can view all announcements"
  ON public.announcements FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Students can view student announcements targeted at them
CREATE POLICY "Students can view targeted student announcements"
  ON public.announcements FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
    AND type = 'student'
    AND EXISTS (
      SELECT 1 FROM public.announcement_audiences aa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE aa.announcement_id = announcements.id
      AND aa.grade = p.grade
      AND (aa.section IS NULL OR aa.section = p.section)
    )
  );

-- Staff can create announcements (teachers: student only; coordinators/principals/admins: both types)
CREATE POLICY "Staff can create announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Staff can delete their own announcements
CREATE POLICY "Staff can delete own announcements"
  ON public.announcements FOR DELETE
  USING (
    created_by = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

-- Announcement audiences: viewable by staff
CREATE POLICY "Staff can view announcement audiences"
  ON public.announcement_audiences FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Students can view audiences for announcements they can see
CREATE POLICY "Students can view own announcement audiences"
  ON public.announcement_audiences FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_audiences.announcement_id
      AND a.type = 'student'
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND announcement_audiences.grade = p.grade
        AND (announcement_audiences.section IS NULL OR announcement_audiences.section = p.section)
      )
    )
  );

-- Staff can insert audiences
CREATE POLICY "Staff can insert announcement audiences"
  ON public.announcement_audiences FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Staff can delete audiences (cascade from announcement delete)
CREATE POLICY "Staff can delete announcement audiences"
  ON public.announcement_audiences FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_audiences_announcement_id ON public.announcement_audiences(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_audiences_grade ON public.announcement_audiences(grade);
CREATE INDEX IF NOT EXISTS idx_announcement_audiences_team_id ON public.announcement_audiences(team_id);

-- Trigger for updated_at
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- Grant access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- PART 13: SAMPLE STUDENT ACCOUNTS
-- Run this AFTER creating auth users via Supabase dashboard
-- or use the direct insert method below for testing
-- ============================================

-- Sample Student UUIDs (use these when creating auth users)
-- Team A (grades 1-5):
--   student1a: b0000000-0000-0000-0000-000000000001
--   student2a: b0000000-0000-0000-0000-000000000002
-- Team B (grades 6-8):
--   student1b: b0000000-0000-0000-0000-000000000003
--   student2b: b0000000-0000-0000-0000-000000000004
-- Team C (grades 9-12):
--   student1c: b0000000-0000-0000-0000-000000000005
--   student2c: b0000000-0000-0000-0000-000000000006

-- OPTION 1: If you created auth users with the UUIDs above, run this to set their profiles:
-- UPDATE public.profiles SET role = 'student', grade = 3, section = 'A' WHERE id = 'b0000000-0000-0000-0000-000000000001';
-- UPDATE public.profiles SET role = 'student', grade = 5, section = 'B' WHERE id = 'b0000000-0000-0000-0000-000000000002';
-- UPDATE public.profiles SET role = 'student', grade = 6, section = 'A' WHERE id = 'b0000000-0000-0000-0000-000000000003';
-- UPDATE public.profiles SET role = 'student', grade = 8, section = 'B' WHERE id = 'b0000000-0000-0000-0000-000000000004';
-- UPDATE public.profiles SET role = 'student', grade = 9, section = 'A' WHERE id = 'b0000000-0000-0000-0000-000000000005';
-- UPDATE public.profiles SET role = 'student', grade = 12, section = 'B' WHERE id = 'b0000000-0000-0000-0000-000000000006';

-- OPTION 2: Direct insert for testing (bypasses auth, won't be able to login)
-- Uncomment to use:
/*
INSERT INTO public.profiles (id, email, full_name, role, grade, section)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'student1a@test.local', 'Alice Student (3A)', 'student', 3, 'A'),
  ('b0000000-0000-0000-0000-000000000002', 'student2a@test.local', 'Bob Student (5B)', 'student', 5, 'B'),
  ('b0000000-0000-0000-0000-000000000003', 'student1b@test.local', 'Carol Student (6A)', 'student', 6, 'A'),
  ('b0000000-0000-0000-0000-000000000004', 'student2b@test.local', 'David Student (8B)', 'student', 8, 'B'),
  ('b0000000-0000-0000-0000-000000000005', 'student1c@test.local', 'Eve Student (9A)', 'student', 9, 'A'),
  ('b0000000-0000-0000-0000-000000000006', 'student2c@test.local', 'Frank Student (12B)', 'student', 12, 'B')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  grade = EXCLUDED.grade,
  section = EXCLUDED.section;
*/

-- ============================================
-- MULTI-TEAM MEMBERSHIP FOR TEACHERS
-- The schema already supports this! The unique constraint is (team_id, user_id),
-- meaning a teacher can be in multiple different teams, just not the same team twice.
-- Example: To add a teacher to multiple teams:
-- INSERT INTO public.team_members (team_id, user_id) VALUES
--   ('a0000000-0000-0000-0000-000000000001', '<teacher_uuid>'),  -- Team A
--   ('a0000000-0000-0000-0000-000000000002', '<teacher_uuid>');  -- Team B
-- ============================================

-- ============================================
-- PART 14: FIX RLS POLICIES TO USE PROFILES TABLE
-- This fixes the issue where updating profiles doesn't update JWT metadata
-- Run this to replace the announcement RLS policies with ones that check profiles
-- ============================================

-- Helper function to get user role from profiles (more reliable than JWT)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop old announcement policies
DROP POLICY IF EXISTS "Staff can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Students can view targeted student announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can delete own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can view announcement audiences" ON public.announcement_audiences;
DROP POLICY IF EXISTS "Students can view own announcement audiences" ON public.announcement_audiences;
DROP POLICY IF EXISTS "Staff can insert announcement audiences" ON public.announcement_audiences;
DROP POLICY IF EXISTS "Staff can delete announcement audiences" ON public.announcement_audiences;

-- Recreate with profiles-based role check
CREATE POLICY "Staff can view all announcements"
  ON public.announcements FOR SELECT
  USING (public.get_user_role() IN ('teacher', 'coordinator', 'principal', 'admin'));

CREATE POLICY "Students can view targeted student announcements"
  ON public.announcements FOR SELECT
  USING (
    public.get_user_role() = 'student'
    AND type = 'student'
    AND EXISTS (
      SELECT 1 FROM public.announcement_audiences aa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE aa.announcement_id = announcements.id
      AND aa.grade = p.grade
      AND (aa.section IS NULL OR aa.section = p.section)
    )
  );

CREATE POLICY "Staff can create announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (public.get_user_role() IN ('teacher', 'coordinator', 'principal', 'admin'));

CREATE POLICY "Staff can delete own announcements"
  ON public.announcements FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.get_user_role() IN ('principal', 'admin')
  );

CREATE POLICY "Staff can view announcement audiences"
  ON public.announcement_audiences FOR SELECT
  USING (public.get_user_role() IN ('teacher', 'coordinator', 'principal', 'admin'));

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

CREATE POLICY "Staff can insert announcement audiences"
  ON public.announcement_audiences FOR INSERT
  WITH CHECK (public.get_user_role() IN ('teacher', 'coordinator', 'principal', 'admin'));

CREATE POLICY "Staff can delete announcement audiences"
  ON public.announcement_audiences FOR DELETE
  USING (public.get_user_role() IN ('teacher', 'coordinator', 'principal', 'admin'));

-- ============================================
-- PART 15: STAFF LEAVE MANAGEMENT SYSTEM
-- ============================================

-- Leave types
CREATE TYPE public.leave_type AS ENUM ('casual', 'medical');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Leave applications table
CREATE TABLE public.leave_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  leave_type public.leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status public.leave_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave approvals table (tracks each level of approval)
CREATE TABLE public.leave_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_application_id UUID REFERENCES public.leave_applications(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approver_role TEXT NOT NULL, -- 'coordinator', 'principal', 'admin'
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- for coordinator approvals
  status public.leave_status DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_approvals ENABLE ROW LEVEL SECURITY;

-- Helper: check if a leave_application belongs to the current user
-- SECURITY DEFINER bypasses RLS to avoid circular policy references
CREATE OR REPLACE FUNCTION public.is_own_leave_application(application_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leave_applications
    WHERE id = application_id AND applicant_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Leave applications policies (NO reference to leave_approvals to avoid circular deps)
CREATE POLICY "Users can view own leave applications"
  ON public.leave_applications FOR SELECT
  USING (applicant_id = auth.uid());

-- Approver-level staff see all applications
CREATE POLICY "Approvers can view all leave applications"
  ON public.leave_applications FOR SELECT
  USING (public.get_user_role() IN ('coordinator', 'principal', 'admin'));

-- Staff can create leave applications (not admin)
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

-- Leave approvals policies (NO RLS-subject reference to leave_applications)
-- Applicant sees approvals for their own applications via SECURITY DEFINER fn
CREATE POLICY "Users can view own application approvals"
  ON public.leave_approvals FOR SELECT
  USING (public.is_own_leave_application(leave_application_id));

-- Approver sees their assigned approvals; principal/admin see all
CREATE POLICY "Approvers can view assigned approvals"
  ON public.leave_approvals FOR SELECT
  USING (
    approver_id = auth.uid()
    OR public.get_user_role() IN ('principal', 'admin')
  );

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

-- Staff can insert approval records when creating a leave application
CREATE POLICY "Staff can insert leave approvals"
  ON public.leave_approvals FOR INSERT
  WITH CHECK (public.get_user_role() IN ('teacher', 'coordinator', 'principal', 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_applications_applicant ON public.leave_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON public.leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON public.leave_applications(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_approvals_application ON public.leave_approvals(leave_application_id);
CREATE INDEX IF NOT EXISTS idx_leave_approvals_approver ON public.leave_approvals(approver_id);

-- Trigger for updated_at
CREATE TRIGGER leave_applications_updated_at
  BEFORE UPDATE ON public.leave_applications
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- ============================================
-- DONE! Now create users manually.
-- See MANUAL-USER-CREATION.md for instructions.
-- ============================================
