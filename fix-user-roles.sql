-- ============================================
-- FIX: Sync User Roles to JWT Metadata
-- ============================================
-- This updates auth.users metadata to match profiles table roles
-- Run this AFTER running diagnose-role-issue.sql

-- Update all users' raw_user_meta_data with role from profiles table
UPDATE auth.users u
SET raw_user_meta_data = jsonb_set(
  COALESCE(u.raw_user_meta_data, '{}'::jsonb),
  '{role}',
  to_jsonb(p.role)
)
FROM public.profiles p
WHERE u.id = p.id
AND (u.raw_user_meta_data->>'role' IS NULL
     OR u.raw_user_meta_data->>'role' != p.role);

-- Verify the fix worked
SELECT
  u.email,
  u.raw_user_meta_data->>'role' as auth_role,
  p.role as profile_role,
  CASE
    WHEN u.raw_user_meta_data->>'role' = p.role THEN '✅ Fixed!'
    ELSE '❌ Still broken'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.email;
