# Database Fix Instructions

## 🚨 CRITICAL: Run This SQL to Fix All Issues

Your application is experiencing RLS (Row Level Security) policy issues that prevent:
- ❌ Creating classrooms
- ❌ Creating teams (403 forbidden errors)
- ❌ Creating announcements (teams not loading)
- ❌ Viewing teams (500 infinite recursion errors)
- ❌ Viewing team member names (showing "Unknown")
- ❌ Fetching profile data (406 errors)
- ❌ Teams dropdown empty in announcement creation

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**

### Step 2: Run the Fix SQL

1. Open the file: `fix-rls-policies.sql`
2. **Copy ALL contents** of the file
3. **Paste** into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl/Cmd + Enter)

### Step 3: Verify the Fix

You should see:
```
Success. No rows returned
```

This means all policies have been updated successfully!

### Step 4: Test Your Application

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Try creating a classroom - should work now ✅
3. Try creating a team - should work now ✅
4. Check team members - names should appear correctly ✅

## What Does This Fix?

### 1. Infinite Recursion Errors (CRITICAL!)
**Error:** `infinite recursion detected in policy for relation "team_members"`
**Error:** `infinite recursion detected in policy for relation "classroom_members"`

**Fix:** Removed self-referencing queries from policies - simplified to use role checks instead

### 2. Profile Fetch Errors (406)
**Error:** `Failed to load resource: the server responded with a status of 406`

**Fix:** Added proper RLS policies to allow authenticated users to view all profiles

### 3. Classroom Creation Blocked (403)
**Error:** `new row violates row-level security policy for table "classrooms"`

**Fix:** Updated INSERT policies to allow teachers/coordinators/principals/admins to create classrooms

### 4. Team Creation Blocked (403)
**Error:** `new row violates row-level security policy for table "teams"`

**Fix:** Updated INSERT policies to allow teachers/coordinators/principals/admins to create teams

### 5. Team Members Showing "Unknown"
**Issue:** Member names not loading due to profile fetch restrictions

**Fix:** Enabled authenticated users to view all profiles needed for displaying member information

### 6. Teams Not Loading (500 Errors)
**Error:** `Failed to fetch teams: infinite recursion detected in policy for relation "team_members"`

**Fix:** Simplified team_members SELECT policy to avoid recursion - staff can now view all team members

### 7. Teams Dropdown Empty in Announcements
**Issue:** Can't select teams when creating announcements

**Fix:** Staff can now view all teams without recursive policy checks

### 8. Can't Create Teams (403 Forbidden)
**Error:** `new row violates row-level security policy for table "teams"`

**Fix:** Proper INSERT policy allows all staff (teacher/coordinator/principal/admin) to create teams

## Troubleshooting

### If the fix doesn't work:

1. **Check your role in Supabase:**
   ```sql
   SELECT * FROM auth.users;
   ```
   Verify your user has the correct `role` in `user_metadata`

2. **Manually set your role:**
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = jsonb_set(
     COALESCE(raw_user_meta_data, '{}'::jsonb),
     '{role}',
     '"admin"'::jsonb
   )
   WHERE email = 'your-email@example.com';
   ```

3. **Verify policies are active:**
   ```sql
   SELECT schemaname, tablename, policyname, cmd, qual
   FROM pg_policies
   WHERE tablename IN ('profiles', 'teams', 'team_members', 'classrooms', 'classroom_members')
   ORDER BY tablename, policyname;
   ```

4. **Clear browser cache and reload**

## About Profile Creation

**Note:** The profiles page (`/more/profiles`) is for *viewing and editing* existing profiles, not creating new ones.

**To create new users:**
- Users must sign up through the `/login` page (signup mode)
- During signup, they select their role and provide their information
- Their profile is automatically created in the database

**If you need to manually create a user as admin:**
1. Use Supabase Dashboard → Authentication → Users → "Invite User"
2. Or have them sign up through the normal signup flow
3. Then edit their profile in `/admin/users` or `/more/profiles`

## Need More Help?

If you're still experiencing issues after running the SQL fix:
1. Check the browser console for specific error messages
2. Look at the Supabase logs in Dashboard → Logs
3. Verify your user's role is set correctly in `auth.users` table

---

**File to run:** `fix-rls-policies.sql`
**Estimated time:** 5-10 seconds
**Risk level:** ✅ Safe (only updates RLS policies, doesn't modify data)
