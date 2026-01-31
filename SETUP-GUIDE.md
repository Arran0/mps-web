# 🚨 EMERGENCY FIX: Database Error Querying Schema

## Problem
You're getting **"Database error querying schema"** when trying to sign in. This happens because your Supabase database is missing the required tables.

## Solution (Follow in Order)

### Step 1: Run the Database Setup SQL

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/fgzerfpqyncpjpiadjqh
   - Log in if needed

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy and Run the Complete Rebuild SQL**
   - Open the file `supabase-complete-rebuild.sql` in your project folder
   - Select ALL the content (Cmd+A on Mac, Ctrl+A on Windows)
   - Copy it (Cmd+C or Ctrl+C)
   - Paste it into the SQL Editor
   - Click **"Run"** button (or press Cmd+Enter)
   - Wait for "Success" message

4. **CRITICAL: Restart Your Supabase Project**
   - Go to **Settings** → **General** (in left sidebar)
   - Scroll down to find **"Restart project"** button
   - Click **"Restart project"**
   - Wait 30-60 seconds for restart to complete
   - You'll see a "Project is ready" message

### Step 2: Clear Your Browser Data

**Option A - Use Incognito/Private Mode (Recommended)**
- Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)
- Safari: Cmd+Shift+N
- Open: http://localhost:3000

**Option B - Clear Cache**
- Chrome: Settings → Privacy → Clear browsing data → Cached images and files
- Safari: Safari → Clear History → All History

### Step 3: Test Login

1. Open your app: http://localhost:3000
2. You should see the login page
3. Try logging in with a test account:
   - **Email:** `principal@mps.edu`
   - **Password:** `MPS@2026`

4. If successful, you'll be redirected to `/home` and see the dashboard!

---

## What Did the SQL Do?

The `supabase-complete-rebuild.sql` script:

✅ **Cleaned up** - Dropped all existing tables and started fresh
✅ **Created `profiles` table** - Stores user information (name, role, email)
✅ **Set up RLS policies** - Security rules so users can only see their own data
✅ **Created trigger** - Automatically creates profile when user signs up
✅ **Created `teams` table** - For organizing users into teams
✅ **Created `tasks` table** - For task management (staff only)
✅ **Created test accounts** - 11 users with different roles for testing

---

## Test Accounts Created

All accounts use password: **MPS@2026**

| Email | Role | Description |
|-------|------|-------------|
| principal@mps.edu | Principal | Full access |
| admin@mps.edu | Admin | Full access |
| teama_coordinator@mps.edu | Coordinator | Team A Coordinator |
| teama_teacher1@mps.edu | Teacher | Team A Teacher 1 |
| teama_teacher2@mps.edu | Teacher | Team A Teacher 2 |
| teamb_coordinator@mps.edu | Coordinator | Team B Coordinator |
| teamb_teacher1@mps.edu | Teacher | Team B Teacher 1 |
| teamb_teacher2@mps.edu | Teacher | Team B Teacher 2 |
| teamc_coordinator@mps.edu | Coordinator | Team C Coordinator |
| teamc_teacher1@mps.edu | Teacher | Team C Teacher 1 |
| teamc_teacher2@mps.edu | Teacher | Team C Teacher 2 |

---

## Verify Your Environment Variables

Make sure your `.env.local` file has the correct values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fgzerfpqyncpjpiadjqh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnemVyZnBxeW5jcGpwaWFkanFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NjczMTEsImV4cCI6MjA4NTM0MzMxMX0.3nnKaI3Z3WUtyaQVEUuZSH-rDIPcL50C6rgWDVlaaNw
```

---

## Still Having Issues?

### Error: "Failed to fetch"
- Check if your dev server is running: `npm run dev`
- Check if Supabase project is running (green status in dashboard)

### Error: "Invalid login credentials"
- Make sure you ran the SQL script completely
- Make sure you restarted the Supabase project
- Try using exact credentials: `principal@mps.edu` / `MPS@2026`

### Error: "Profile not found"
- The trigger might not have fired
- Go back to Supabase SQL Editor
- Run this quick fix:
```sql
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email,
  COALESCE(raw_user_meta_data->>'full_name', 'User'),
  COALESCE(raw_user_meta_data->>'role', 'student')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

### Need to Start Over?
Just run the `supabase-complete-rebuild.sql` again. It will:
1. Drop everything
2. Recreate all tables fresh
3. Add all test accounts back

---

## Understanding the Architecture

### Database Tables

```
auth.users (Supabase built-in)
  ↓ (trigger: on_auth_user_created)
public.profiles
  ├── id (references auth.users.id)
  ├── email
  ├── full_name
  ├── role (student/teacher/coordinator/principal/admin)
  └── avatar_url

public.teams
  └── team_members (links users to teams)

public.tasks (staff only)
  ├── task_assignees (links tasks to users)
  ├── task_checklist_items
  └── task_comments
```

### Authentication Flow

1. User enters email/password → Login page
2. Supabase Auth validates credentials
3. App queries `profiles` table to get role
4. User redirected to `/home` dashboard
5. Navbar shows role-specific navigation

### Row Level Security (RLS)

All tables use RLS policies to ensure:
- Users can only see their own profile
- Staff can see all profiles (for task assignment)
- Only staff can create/edit tasks
- Students have limited access

---

## Next Steps After Fix

Once login works:

1. **Test all roles**
   - Try logging in with different test accounts
   - Verify each role sees the right features

2. **Create your own admin account**
   - Use the signup form
   - Select "Admin" role
   - You can delete test accounts later

3. **Customize the app**
   - Add your school logo
   - Update colors in `tailwind.config.js`
   - Modify navigation items in `Navbar.tsx`

4. **Deploy to production**
   - Push code to GitHub
   - Deploy on Vercel
   - Add environment variables in Vercel dashboard

---

**Need more help?** Check the main README.md or create a GitHub issue.
