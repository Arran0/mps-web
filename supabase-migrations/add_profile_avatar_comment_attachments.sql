-- Add avatar_url to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add global_banner_url to a settings table (or store in profiles for admin)
-- We'll use a simple app_settings table for global banner
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default banner setting
INSERT INTO app_settings (key, value) VALUES ('profile_banner_url', null)
ON CONFLICT (key) DO NOTHING;

-- Add attachment fields to task_comments
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS attachment_type TEXT; -- 'image' | 'document' | 'link'

-- Add user profile join to task_comments (already exists via profiles)
-- Storage buckets need to be created in Supabase dashboard:
-- 1. "avatars" bucket (public) for profile pictures
-- 2. "task-attachments" bucket (public) for task comment files
-- 3. "banners" bucket (public) for profile banners
