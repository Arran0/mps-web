-- ============================================================
-- Migration: Classroom banners/logos + Announcement attachments + Site settings
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add banner_url and logo_url columns to classrooms table
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS logo_url text;

-- 2. Add attachments JSONB column to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachments jsonb;

-- 3. Create site_settings table for welcome banner and other settings
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read site settings
DROP POLICY IF EXISTS "Read site_settings" ON site_settings;
CREATE POLICY "Read site_settings"
  ON site_settings FOR SELECT
  USING (true);

-- Only admin can write site settings
DROP POLICY IF EXISTS "Admin write site_settings" ON site_settings;
CREATE POLICY "Admin write site_settings"
  ON site_settings FOR ALL
  USING (true)
  WITH CHECK (true);
