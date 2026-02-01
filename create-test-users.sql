-- ============================================
-- ALTERNATIVE: Create test users through Supabase Auth API
-- Run this if direct SQL INSERT into auth.users is causing issues
-- ============================================

-- First, clean up existing test users
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@mps.edu'
);
DELETE FROM auth.users WHERE email LIKE '%@mps.edu';
DELETE FROM public.profiles WHERE email LIKE '%@mps.edu';

-- The proper way is to create users through Supabase Auth API
-- Unfortunately, we can't do that directly in SQL.
-- Instead, use the signup form in your app or use this workaround:

-- Create users with proper password hashing
-- Password: MPS@2026

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'b0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'principal@mps.edu',
    crypt('MPS@2026', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Principal","role":"principal"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

-- Create corresponding identity
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', 'b0000000-0000-0000-0000-000000000001', 'principal@mps.edu')::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
);

-- Trigger should auto-create profile, but let's ensure it exists
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'principal@mps.edu',
  'Principal',
  'principal'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Verify
SELECT email, created_at FROM auth.users WHERE email = 'principal@mps.edu';
SELECT email, full_name, role FROM public.profiles WHERE email = 'principal@mps.edu';
