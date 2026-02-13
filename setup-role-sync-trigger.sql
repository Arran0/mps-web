-- ============================================
-- AUTOMATIC ROLE SYNC (OPTIONAL BUT RECOMMENDED)
-- ============================================
-- This creates a trigger to automatically sync profile roles to auth metadata
-- Run this AFTER fix-user-roles.sql to prevent future role sync issues

-- Create a function to sync role to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the auth.users table with the new role
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_role_to_auth ON public.profiles;

-- Create the trigger
CREATE TRIGGER sync_role_to_auth
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_auth_metadata();

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ Role sync trigger created! Roles will now automatically sync to JWT metadata.';
END $$;
