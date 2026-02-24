-- ============================================
-- PART 16: CLASSROOMS MODULE
-- Run this AFTER the main schema (supabase-schema-only.sql)
-- ============================================

-- Drop existing classroom tables if re-running
DROP TABLE IF EXISTS public.classroom_discussions CASCADE;
DROP TABLE IF EXISTS public.classroom_assessment_marks CASCADE;
DROP TABLE IF EXISTS public.classroom_assessments CASCADE;
DROP TABLE IF EXISTS public.classroom_submissions CASCADE;
DROP TABLE IF EXISTS public.classroom_file_progress CASCADE;
DROP TABLE IF EXISTS public.classroom_files CASCADE;
DROP TABLE IF EXISTS public.classroom_folders CASCADE;
DROP TABLE IF EXISTS public.classroom_members CASCADE;
DROP TABLE IF EXISTS public.classrooms CASCADE;

-- ============================================
-- STEP 1: CREATE ALL TABLES
-- ============================================

-- 16.1: CLASSROOMS TABLE
CREATE TABLE public.classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16.2: CLASSROOM MEMBERS
CREATE TABLE public.classroom_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'coordinator', 'principal', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, user_id)
);

-- 16.3: CLASSROOM FOLDERS (Course Work / Homework)
CREATE TABLE public.classroom_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('coursework', 'homework')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16.4: CLASSROOM FILES (inside folders)
CREATE TABLE public.classroom_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID REFERENCES public.classroom_folders(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  requires_submission BOOLEAN DEFAULT FALSE,
  submission_type TEXT CHECK (submission_type IS NULL OR submission_type IN ('text', 'link')),
  requires_check BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  attachment_name TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16.5: FILE PROGRESS (student tracking)
CREATE TABLE public.classroom_file_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES public.classroom_files(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_done' CHECK (status IN ('not_done', 'partial', 'done', 'completed')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, student_id)
);

-- 16.6: SUBMISSIONS (homework submissions)
CREATE TABLE public.classroom_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES public.classroom_files(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('text', 'link')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, student_id)
);

-- 16.7: ASSESSMENTS
CREATE TABLE public.classroom_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  tag TEXT NOT NULL DEFAULT 'other' CHECK (tag IN ('main', 'other')),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16.8: ASSESSMENT MARKS
CREATE TABLE public.classroom_assessment_marks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID REFERENCES public.classroom_assessments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  marks NUMERIC,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, student_id)
);

-- 16.9: DISCUSSION BOARD
CREATE TABLE public.classroom_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.classroom_discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_file_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assessment_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_discussions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: HELPER FUNCTION (bypasses RLS to avoid infinite recursion)
-- ============================================

-- Returns true if the current user is a member of the given classroom.
-- SECURITY DEFINER so it runs without RLS, breaking the recursion loop.
CREATE OR REPLACE FUNCTION public.user_is_classroom_member(p_classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_id = p_classroom_id
      AND user_id = auth.uid()
  );
$$;

-- ============================================
-- STEP 4: CREATE ALL RLS POLICIES
-- (All tables exist now, so cross-table references work)
-- ============================================

-- CLASSROOMS policies
CREATE POLICY "Members can view classrooms"
  ON public.classrooms FOR SELECT
  TO authenticated USING (
    public.user_is_classroom_member(classrooms.id)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Staff can create classrooms"
  ON public.classrooms FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can update classrooms"
  ON public.classrooms FOR UPDATE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

CREATE POLICY "Admin can delete classrooms"
  ON public.classrooms FOR DELETE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

-- CLASSROOM MEMBERS policies
CREATE POLICY "Members can view classroom members"
  ON public.classroom_members FOR SELECT
  TO authenticated USING (
    public.user_is_classroom_member(classroom_members.classroom_id)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Staff can manage classroom members"
  ON public.classroom_members FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can remove classroom members"
  ON public.classroom_members FOR DELETE
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

-- CLASSROOM FOLDERS policies
CREATE POLICY "Classroom members can view folders"
  ON public.classroom_folders FOR SELECT
  TO authenticated USING (
    public.user_is_classroom_member(classroom_folders.classroom_id)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Staff can manage folders"
  ON public.classroom_folders FOR ALL
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- CLASSROOM FILES policies
CREATE POLICY "Classroom members can view files"
  ON public.classroom_files FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.classroom_folders cf
      WHERE cf.id = classroom_files.folder_id
        AND public.user_is_classroom_member(cf.classroom_id)
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Staff can manage files"
  ON public.classroom_files FOR ALL
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- FILE PROGRESS policies
CREATE POLICY "Students can manage own progress"
  ON public.classroom_file_progress FOR ALL
  TO authenticated USING (
    student_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- SUBMISSIONS policies
CREATE POLICY "Students can manage own submissions"
  ON public.classroom_submissions FOR ALL
  TO authenticated USING (
    student_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- ASSESSMENTS policies
CREATE POLICY "Classroom members can view assessments"
  ON public.classroom_assessments FOR SELECT
  TO authenticated USING (
    public.user_is_classroom_member(classroom_assessments.classroom_id)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Staff can manage assessments"
  ON public.classroom_assessments FOR ALL
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- ASSESSMENT MARKS policies
CREATE POLICY "Students can view own marks"
  ON public.classroom_assessment_marks FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

CREATE POLICY "Staff can manage marks"
  ON public.classroom_assessment_marks FOR ALL
  TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'coordinator', 'principal', 'admin')
  );

-- DISCUSSIONS policies
CREATE POLICY "Classroom members can view discussions"
  ON public.classroom_discussions FOR SELECT
  TO authenticated USING (
    public.user_is_classroom_member(classroom_discussions.classroom_id)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Classroom members can post discussions"
  ON public.classroom_discussions FOR INSERT
  TO authenticated WITH CHECK (
    public.user_is_classroom_member(classroom_discussions.classroom_id)
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('principal', 'admin')
  );

CREATE POLICY "Users can delete own posts"
  ON public.classroom_discussions FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('coordinator', 'principal', 'admin')
  );

-- ============================================
-- STEP 4: INDEXES
-- ============================================

CREATE INDEX idx_classrooms_coordinator ON public.classrooms(coordinator_id);
CREATE INDEX idx_classroom_members_classroom ON public.classroom_members(classroom_id);
CREATE INDEX idx_classroom_members_user ON public.classroom_members(user_id);
CREATE INDEX idx_classroom_folders_classroom ON public.classroom_folders(classroom_id);
CREATE INDEX idx_classroom_folders_type ON public.classroom_folders(type);
CREATE INDEX idx_classroom_files_folder ON public.classroom_files(folder_id);
CREATE INDEX idx_classroom_files_due_date ON public.classroom_files(due_date);
CREATE INDEX idx_file_progress_file ON public.classroom_file_progress(file_id);
CREATE INDEX idx_file_progress_student ON public.classroom_file_progress(student_id);
CREATE INDEX idx_submissions_file ON public.classroom_submissions(file_id);
CREATE INDEX idx_submissions_student ON public.classroom_submissions(student_id);
CREATE INDEX idx_assessments_classroom ON public.classroom_assessments(classroom_id);
CREATE INDEX idx_assessments_tag ON public.classroom_assessments(tag);
CREATE INDEX idx_assessment_marks_assessment ON public.classroom_assessment_marks(assessment_id);
CREATE INDEX idx_assessment_marks_student ON public.classroom_assessment_marks(student_id);
CREATE INDEX idx_discussions_classroom ON public.classroom_discussions(classroom_id);
CREATE INDEX idx_discussions_parent ON public.classroom_discussions(parent_id);

-- ============================================
-- STEP 5: TRIGGERS
-- ============================================

CREATE TRIGGER classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

CREATE TRIGGER classroom_folders_updated_at
  BEFORE UPDATE ON public.classroom_folders
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

CREATE TRIGGER classroom_files_updated_at
  BEFORE UPDATE ON public.classroom_files
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

CREATE TRIGGER classroom_assessments_updated_at
  BEFORE UPDATE ON public.classroom_assessments
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- Grant access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- DONE! Classrooms module schema created.
-- ============================================
