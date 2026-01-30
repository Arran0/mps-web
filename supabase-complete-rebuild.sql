-- ============================================
-- MPS Web - COMPLETE Supabase Rebuild
-- Run this ONCE in your Supabase SQL Editor
-- This is the ONLY file you need to run.
-- It DROPS everything first, then rebuilds.
-- ============================================

-- ============================================
-- STEP 0: CLEAN WIPE (drop everything)
-- ============================================
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.task_checklist_items CASCADE;
DROP TABLE IF EXISTS public.task_assignees CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DELETE FROM auth.identities;
DELETE FROM auth.users;

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

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'coordinator', 'principal', 'admin')
    )
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

CREATE POLICY "Team members manageable by staff" ON public.team_members
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coordinator', 'principal', 'admin')
    )
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

CREATE POLICY "Tasks viewable by staff" ON public.tasks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
  );

CREATE POLICY "Tasks insertable by staff" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
  );

CREATE POLICY "Tasks updatable by staff" ON public.tasks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
  );

CREATE POLICY "Tasks deletable by staff" ON public.tasks
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
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
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
  );

CREATE POLICY "Task assignees manageable by staff" ON public.task_assignees
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
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
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
  );

CREATE POLICY "Checklist manageable by staff" ON public.task_checklist_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
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
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
  );

CREATE POLICY "Comments insertable by staff" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal', 'admin'))
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
-- PART 9: SEED DATA
-- Password for ALL users: MPS@2026
-- 1 Principal, 1 Admin
-- Team A: 1 Coordinator + 2 Teachers
-- Team B: 1 Coordinator + 2 Teachers
-- Team C: 1 Coordinator + 2 Teachers
-- ============================================

-- Auth users (the on_auth_user_created trigger auto-creates profiles)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'principal@mps.edu',        crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Principal","role":"principal"}', '', '', '', ''),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@mps.edu',             crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin","role":"admin"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teama_coordinator@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team A Coordinator","role":"coordinator"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teama_teacher1@mps.edu',    crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team A Teacher 1","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teama_teacher2@mps.edu',    crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team A Teacher 2","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teamb_coordinator@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team B Coordinator","role":"coordinator"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teamb_teacher1@mps.edu',    crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team B Teacher 1","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teamb_teacher2@mps.edu',    crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team B Teacher 2","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teamc_coordinator@mps.edu', crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team C Coordinator","role":"coordinator"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teamc_teacher1@mps.edu',    crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team C Teacher 1","role":"teacher"}', '', '', '', ''),
  ('c0000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teamc_teacher2@mps.edu',    crypt('MPS@2026', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Team C Teacher 2","role":"teacher"}', '', '', '', '');

-- Identities (required for email/password login)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', '{"sub":"b0000000-0000-0000-0000-000000000001","email":"principal@mps.edu"}',        'email', 'b0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', '{"sub":"b0000000-0000-0000-0000-000000000002","email":"admin@mps.edu"}',             'email', 'b0000000-0000-0000-0000-000000000002', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000a1', '{"sub":"c0000000-0000-0000-0000-0000000000a1","email":"teama_coordinator@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000a1', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000a2', '{"sub":"c0000000-0000-0000-0000-0000000000a2","email":"teama_teacher1@mps.edu"}',    'email', 'c0000000-0000-0000-0000-0000000000a2', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000a3', '{"sub":"c0000000-0000-0000-0000-0000000000a3","email":"teama_teacher2@mps.edu"}',    'email', 'c0000000-0000-0000-0000-0000000000a3', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000b1', '{"sub":"c0000000-0000-0000-0000-0000000000b1","email":"teamb_coordinator@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000b1', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000b2', '{"sub":"c0000000-0000-0000-0000-0000000000b2","email":"teamb_teacher1@mps.edu"}',    'email', 'c0000000-0000-0000-0000-0000000000b2', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000b3', '{"sub":"c0000000-0000-0000-0000-0000000000b3","email":"teamb_teacher2@mps.edu"}',    'email', 'c0000000-0000-0000-0000-0000000000b3', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000c1', '{"sub":"c0000000-0000-0000-0000-0000000000c1","email":"teamc_coordinator@mps.edu"}', 'email', 'c0000000-0000-0000-0000-0000000000c1', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000c2', '{"sub":"c0000000-0000-0000-0000-0000000000c2","email":"teamc_teacher1@mps.edu"}',    'email', 'c0000000-0000-0000-0000-0000000000c2', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-0000000000c3', '{"sub":"c0000000-0000-0000-0000-0000000000c3","email":"teamc_teacher2@mps.edu"}',    'email', 'c0000000-0000-0000-0000-0000000000c3', NOW(), NOW(), NOW());

-- Safety net: if trigger didn't fire, explicitly create profiles
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'principal@mps.edu',        'Principal',           'principal'),
  ('b0000000-0000-0000-0000-000000000002', 'admin@mps.edu',             'Admin',               'admin'),
  ('c0000000-0000-0000-0000-0000000000a1', 'teama_coordinator@mps.edu', 'Team A Coordinator',  'coordinator'),
  ('c0000000-0000-0000-0000-0000000000a2', 'teama_teacher1@mps.edu',    'Team A Teacher 1',    'teacher'),
  ('c0000000-0000-0000-0000-0000000000a3', 'teama_teacher2@mps.edu',    'Team A Teacher 2',    'teacher'),
  ('c0000000-0000-0000-0000-0000000000b1', 'teamb_coordinator@mps.edu', 'Team B Coordinator',  'coordinator'),
  ('c0000000-0000-0000-0000-0000000000b2', 'teamb_teacher1@mps.edu',    'Team B Teacher 1',    'teacher'),
  ('c0000000-0000-0000-0000-0000000000b3', 'teamb_teacher2@mps.edu',    'Team B Teacher 2',    'teacher'),
  ('c0000000-0000-0000-0000-0000000000c1', 'teamc_coordinator@mps.edu', 'Team C Coordinator',  'coordinator'),
  ('c0000000-0000-0000-0000-0000000000c2', 'teamc_teacher1@mps.edu',    'Team C Teacher 1',    'teacher'),
  ('c0000000-0000-0000-0000-0000000000c3', 'teamc_teacher2@mps.edu',    'Team C Teacher 2',    'teacher')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Teams
INSERT INTO public.teams (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Team A'),
  ('a0000000-0000-0000-0000-000000000002', 'Team B'),
  ('a0000000-0000-0000-0000-000000000003', 'Team C');

-- Team memberships
INSERT INTO public.team_members (team_id, user_id) VALUES
  -- Team A
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a1'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a2'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a3'),
  -- Team B
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b1'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b2'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b3'),
  -- Team C
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c1'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c2'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c3');

-- ============================================
-- ALL LOGINS (password: MPS@2026)
-- ============================================
-- principal@mps.edu         (Principal)
-- admin@mps.edu             (Admin)
-- teama_coordinator@mps.edu (Team A Coordinator)
-- teama_teacher1@mps.edu    (Team A Teacher 1)
-- teama_teacher2@mps.edu    (Team A Teacher 2)
-- teamb_coordinator@mps.edu (Team B Coordinator)
-- teamb_teacher1@mps.edu    (Team B Teacher 1)
-- teamb_teacher2@mps.edu    (Team B Teacher 2)
-- teamc_coordinator@mps.edu (Team C Coordinator)
-- teamc_teacher1@mps.edu    (Team C Teacher 1)
-- teamc_teacher2@mps.edu    (Team C Teacher 2)
-- ============================================
