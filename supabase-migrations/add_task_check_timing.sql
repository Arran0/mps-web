-- Migration: Add require_check and end_time to tasks table
-- Run this in your Supabase SQL editor

-- Add require_check boolean (default false = no check required)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS require_check BOOLEAN NOT NULL DEFAULT false;

-- Add end_time text field (start time is existing 'timing' field)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Update the comment on timing column to clarify it's start time
COMMENT ON COLUMN tasks.timing IS 'Start time for the task (HH:MM format)';
COMMENT ON COLUMN tasks.end_time IS 'End time for the task (HH:MM format)';
COMMENT ON COLUMN tasks.require_check IS 'If true, task needs coordinator/principal verification before completion';
