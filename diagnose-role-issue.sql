-- ============================================
-- DIAGNOSTIC: Check User Roles and Metadata
-- ============================================
-- Run this first to see what's wrong with your user's role

-- 1. Check all users and their roles
SELECT
  id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'role' as role_in_metadata,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Check profiles table roles
SELECT
  id,
  email,
  full_name,
  role as role_in_profiles
FROM public.profiles
ORDER BY created_at DESC;

-- 3. Check if roles match between auth.users and profiles
SELECT
  u.email,
  u.raw_user_meta_data->>'role' as auth_role,
  p.role as profile_role,
  CASE
    WHEN u.raw_user_meta_data->>'role' = p.role THEN '✅ Match'
    ELSE '❌ Mismatch - THIS IS THE PROBLEM!'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
