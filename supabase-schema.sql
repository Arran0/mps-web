-- ============================================
-- MPS Web - Task Manager Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Teams table
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

-- 2. Team members table
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

-- 3. Tasks table
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

-- 4. Task assignees (many-to-many for multi-assignee support)
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

-- 5. Task checklist items
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

-- 6. Task comments (conversation thread)
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

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task_id ON public.task_checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- 8. Updated_at trigger for tasks
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
-- 9. Sample Seed Data: Teams A, B, C
-- Each team has 1 coordinator + 3 teachers
-- Run AFTER creating user accounts in Supabase Auth
-- ============================================

-- Step 1: Create sample teams
INSERT INTO public.teams (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Team A'),
  ('a0000000-0000-0000-0000-000000000002', 'Team B'),
  ('a0000000-0000-0000-0000-000000000003', 'Team C')
ON CONFLICT DO NOTHING;

-- Step 2: Create sample profiles (these UUIDs must match Supabase Auth user IDs)
-- NOTE: Replace these UUIDs with actual user IDs from your Supabase Auth after creating accounts
-- Principal
INSERT INTO public.profiles (id, full_name, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Dr. Ramesh Kumar', 'principal')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Admin
INSERT INTO public.profiles (id, full_name, role) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Anitha Sundaram', 'admin')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Team A: Coordinator + 3 Teachers
INSERT INTO public.profiles (id, full_name, role) VALUES
  ('c0000000-0000-0000-0000-0000000000a1', 'Priya Venkatesh', 'coordinator'),
  ('c0000000-0000-0000-0000-0000000000a2', 'Karthik Rajan', 'teacher'),
  ('c0000000-0000-0000-0000-0000000000a3', 'Lakshmi Narayanan', 'teacher'),
  ('c0000000-0000-0000-0000-0000000000a4', 'Suresh Babu', 'teacher')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Team B: Coordinator + 3 Teachers
INSERT INTO public.profiles (id, full_name, role) VALUES
  ('c0000000-0000-0000-0000-0000000000b1', 'Deepa Krishnan', 'coordinator'),
  ('c0000000-0000-0000-0000-0000000000b2', 'Arjun Selvam', 'teacher'),
  ('c0000000-0000-0000-0000-0000000000b3', 'Meena Devi', 'teacher'),
  ('c0000000-0000-0000-0000-0000000000b4', 'Rajesh Pandian', 'teacher')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Team C: Coordinator + 3 Teachers
INSERT INTO public.profiles (id, full_name, role) VALUES
  ('c0000000-0000-0000-0000-0000000000c1', 'Saranya Murugan', 'coordinator'),
  ('c0000000-0000-0000-0000-0000000000c2', 'Vijay Shankar', 'teacher'),
  ('c0000000-0000-0000-0000-0000000000c3', 'Divya Prakash', 'teacher'),
  ('c0000000-0000-0000-0000-0000000000c4', 'Ganesh Kumar', 'teacher')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Step 3: Assign members to teams
-- Team A members
INSERT INTO public.team_members (team_id, user_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a1'),  -- Priya (Coordinator)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a2'),  -- Karthik (Teacher)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a3'),  -- Lakshmi (Teacher)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a4')   -- Suresh (Teacher)
ON CONFLICT DO NOTHING;

-- Team B members
INSERT INTO public.team_members (team_id, user_id) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b1'),  -- Deepa (Coordinator)
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b2'),  -- Arjun (Teacher)
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b3'),  -- Meena (Teacher)
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000b4')   -- Rajesh (Teacher)
ON CONFLICT DO NOTHING;

-- Team C members
INSERT INTO public.team_members (team_id, user_id) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c1'),  -- Saranya (Coordinator)
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c2'),  -- Vijay (Teacher)
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c3'),  -- Divya (Teacher)
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000c4')   -- Ganesh (Teacher)
ON CONFLICT DO NOTHING;
