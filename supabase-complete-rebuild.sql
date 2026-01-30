-- ============================================
-- MPS Web - COMPLETE Supabase Rebuild
-- Run this ONCE in your Supabase SQL Editor
-- This creates everything from scratch:
--   1. Profiles table + RLS + triggers
--   2. Teams, Tasks, Assignees, Checklists, Comments
--   3. Sample auth users (password: MPS@2026)
--   4. Sample profiles, teams, team members
-- ============================================

-- ============================================
-- PART 1: PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'coordinator', 'principal', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Staff can view ALL profiles (needed for team member selector, assignees, comments)
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Authenticated users can insert their profile
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================
-- PART 2: TEAMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by authenticated users"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- PART 3: TEAM MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members viewable by authenticated users"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members manageable by coordinators/principals/admins"
  ON public.team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('coordinator', 'principal', 'admin')
    )
  );

-- ============================================
-- PART 4: TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.tasks (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks viewable by authenticated staff"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

CREATE POLICY "Tasks insertable by authenticated staff"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

CREATE POLICY "Tasks updatable by authenticated staff"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

CREATE POLICY "Tasks deletable by authenticated staff"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

-- ============================================
-- PART 5: TASK ASSIGNEES
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task assignees viewable by authenticated staff"
  ON public.task_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

CREATE POLICY "Task assignees manageable by staff"
  ON public.task_assignees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

-- ============================================
-- PART 6: TASK CHECKLIST ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checklist items viewable by authenticated staff"
  ON public.task_checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

CREATE POLICY "Checklist items manageable by staff"
  ON public.task_checklist_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

-- ============================================
-- PART 7: TASK COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated staff"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

CREATE POLICY "Comments insertable by staff"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
  );

-- ============================================
-- PART 8: INDEXES & TRIGGERS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task_id ON public.task_checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- ============================================
-- PART 9: SAMPLE SEED DATA
-- 1 Principal, 1 Admin, 3 Teams (1 coordinator + 2 teachers each)
-- All users password: MPS@2026
-- ============================================

-- Step 1: Create auth users
-- The handle_new_user trigger will auto-create profiles with correct name/role
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current)
VALUES
  -- Principal
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ramesh.kumar@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Ramesh Kumar","role":"principal"}', '', '', '', ''),
  -- Admin
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anitha.sundaram@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Anitha Sundaram","role":"admin"}', '', '', '', ''),
  -- Team A: 1 Coordinator + 2 Teachers
  ('c0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.venkatesh@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Venkatesh","role":"coordinator"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'karthik.rajan@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Karthik Rajan","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lakshmi.narayanan@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lakshmi Narayanan","role":"teacher"}', '', '', '', ''),
  -- Team B: 1 Coordinator + 2 Teachers
  ('c0000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'deepa.krishnan@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Deepa Krishnan","role":"coordinator"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arjun.selvam@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arjun Selvam","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'meena.devi@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meena Devi","role":"teacher"}', '', '', '', ''),
  -- Team C: 1 Coordinator + 2 Teachers
  ('c0000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'saranya.murugan@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Saranya Murugan","role":"coordinator"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vijay.shankar@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vijay Shankar","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'divya.prakash@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Divya Prakash","role":"teacher"}', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create identities (required for Supabase Auth email login)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', '{"sub":"b0000000-0000-0000-0000-000000000001","email":"ramesh.kumar@mps.edu"}', 'email', 'b0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', '{"sub":"b0000000-0000-0000-0000-000000000002","email":"anitha.sundaram@mps.edu"}', 'email', 'b0000000-0000-0000-0000-000000000002', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000a1', '{"sub":"c0000000-0000-0000-0000-0000000000a1","email":"priya.venkatesh@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000a1', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000a2', '{"sub":"c0000000-0000-0000-0000-0000000000a2","email":"karthik.rajan@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000a2', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000a3', '{"sub":"c0000000-0000-0000-0000-0000000000a3","email":"lakshmi.narayanan@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000a3', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000b1', '{"sub":"c0000000-0000-0000-0000-0000000000b1","email":"deepa.krishnan@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000b1', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000b2', '{"sub":"c0000000-0000-0000-0000-0000000000b2","email":"arjun.selvam@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000b2', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000b3', '{"sub":"c0000000-0000-0000-0000-0000000000b3","email":"meena.devi@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000b3', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000c1', '{"sub":"c0000000-0000-0000-0000-0000000000c1","email":"saranya.murugan@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000c1', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000c2', '{"sub":"c0000000-0000-0000-0000-0000000000c2","email":"vijay.shankar@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000c2', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000c3', '{"sub":"c0000000-0000-0000-0000-0000000000c3","email":"divya.prakash@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000c3', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Step 3: Create teams
INSERT INTO public.teams (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Team A'),
  ('a0000000-0000-0000-0000-000000000002', 'Team B'),
  ('a0000000-0000-0000-0000-000000000003', 'Team C')
ON CONFLICT DO NOTHING;

-- Step 4: Assign members to teams
-- Team A: Priya (Coordinator) + Karthik, Lakshmi (Teachers)
INSERT INTO public.team_members (team_id, user_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a1'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a2'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a3')
ON CONFLICT DO NOTHING;

-- Team B: Deepa (Coordinator) + Arjun, Meena (Teachers)
INSERT INTO public.team_members (team_id, user_id) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b1'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b2'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b3')
ON CONFLICT DO NOTHING;

-- Team C: Saranya (Coordinator) + Vijay, Divya (Teachers)
INSERT INTO public.team_members (team_id, user_id) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c1'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c2'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c3')
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE! Sample users created:
-- ============================================
-- PRINCIPAL: ramesh.kumar@mps.edu / MPS@2026
-- ADMIN:     anitha.sundaram@mps.edu / MPS@2026
--
-- TEAM A:
--   Coordinator: priya.venkatesh@mps.edu / MPS@2026
--   Teacher:     karthik.rajan@mps.edu / MPS@2026
--   Teacher:     lakshmi.narayanan@mps.edu / MPS@2026
--
-- TEAM B:
--   Coordinator: deepa.krishnan@mps.edu / MPS@2026
--   Teacher:     arjun.selvam@mps.edu / MPS@2026
--   Teacher:     meena.devi@mps.edu / MPS@2026
--
-- TEAM C:
--   Coordinator: saranya.murugan@mps.edu / MPS@2026
--   Teacher:     vijay.shankar@mps.edu / MPS@2026
--   Teacher:     divya.prakash@mps.edu / MPS@2026
-- ============================================
