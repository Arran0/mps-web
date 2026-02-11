-- ==============================================
-- MPS-Web ERP Rebuild Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================

-- 1. Teams table: add description, dates, coordinator
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES profiles(id);

-- 2. Classrooms table: add grade, section
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS section VARCHAR(10);

-- 3. Tasks: add bonus_points column, migrate existing tag data
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;
UPDATE tasks SET bonus_points = 1 WHERE tag = 'bonus';

-- 4. Leave applications: add selected_approver_ids for explicit approver selection
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS selected_approver_ids UUID[] DEFAULT '{}';

-- 5. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_teams_coordinator_id ON teams(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_grade ON classrooms(grade);
CREATE INDEX IF NOT EXISTS idx_classrooms_section ON classrooms(section);
CREATE INDEX IF NOT EXISTS idx_tasks_bonus_points ON tasks(bonus_points);

-- 6. RLS policies for new team columns (teams already have RLS enabled)
-- No new policies needed - existing team policies cover the table

-- 7. Update the updated_at trigger for teams if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at column to teams if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'updated_at') THEN
        ALTER TABLE teams ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
