# Manual Test User Creation Guide

## Why Manual Creation?

**IMPORTANT:** Creating users via SQL INSERT into `auth.users` creates corrupted users that can't sign in. Users MUST be created through Supabase Auth UI or API.

## ✅ Method 1: Create Users in Supabase Dashboard (Easiest)

### Step 1: Go to Authentication in Supabase

1. Open: https://supabase.com/dashboard/project/tgxxqzeaqxiwoqzopcku/auth/users
2. Click **"Add user"** button (top right)

### Step 2: Create Each Test User

For each user, enter:
- **Email:** (from table below)
- **Password:** `MPS@2026`
- **Confirm:** Checked ✅
- Click **"Create user"**

### Step 3: Add User Metadata

After creating each user:
1. Click on the user email in the list
2. Scroll down to **"User Metadata"** section
3. Click **"Edit"** (pencil icon)
4. Add this JSON (replace values for each user):
```json
{
  "full_name": "Principal",
  "role": "principal"
}
```
5. Click **"Save"**

### Step 4: Create Profile in SQL Editor

For EACH user you create, run this in SQL Editor:

```sql
-- Replace these values for each user
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'USER_ID_HERE',  -- Copy from auth.users or user detail page
  'principal@mps.edu',
  'Principal',
  'principal'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
```

## 📋 Test Users to Create

| Email | Password | Full Name | Role |
|-------|----------|-----------|------|
| principal@mps.edu | MPS@2026 | Principal | principal |
| admin@mps.edu | MPS@2026 | Admin | admin |
| teama_coordinator@mps.edu | MPS@2026 | Team A Coordinator | coordinator |
| teama_teacher1@mps.edu | MPS@2026 | Team A Teacher 1 | teacher |
| teama_teacher2@mps.edu | MPS@2026 | Team A Teacher 2 | teacher |
| teamb_coordinator@mps.edu | MPS@2026 | Team B Coordinator | coordinator |
| teamb_teacher1@mps.edu | MPS@2026 | Team B Teacher 1 | teacher |
| teamb_teacher2@mps.edu | MPS@2026 | Team B Teacher 2 | teacher |
| teamc_coordinator@mps.edu | MPS@2026 | Team C Coordinator | coordinator |
| teamc_teacher1@mps.edu | MPS@2026 | Team C Teacher 1 | teacher |
| teamc_teacher2@mps.edu | MPS@2026 | Team C Teacher 2 | teacher |

## ✅ Method 2: Use Node.js Script (Faster)

### Prerequisites

1. Get your **Service Role Key** from Supabase:
   - Go to: https://supabase.com/dashboard/project/tgxxqzeaqxiwoqzopcku/settings/api
   - Copy the **service_role** key (NOT the anon key!)

2. Add to `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Run the Script

```bash
# Install dependencies (if not already installed)
npm install @supabase/supabase-js dotenv

# Run the user creation script
node create-users-properly.js
```

This will create all 11 test users automatically!

## ✅ Method 3: Use Signup Form (For Individual Users)

If you just need a few test users:

1. Go to: http://localhost:3000/login
2. Click **"Sign Up"**
3. Fill in:
   - Full Name: `Test Principal`
   - Email: `testprincipal@example.com`
   - Password: `Test@123`
   - Role: Select **Principal**
4. Click **Sign Up**

**Note:** The signup form may reject @mps.edu emails if there's a validation rule. Use @example.com or @gmail.com instead for testing.

## 🧹 Clean Up Broken Users First

If you have corrupted users from SQL INSERT, delete them first:

```sql
-- Run in Supabase SQL Editor
DELETE FROM public.profiles WHERE email LIKE '%@mps.edu';
DELETE FROM public.team_members;
DELETE FROM auth.identities WHERE provider_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@mps.edu'
);
DELETE FROM auth.users WHERE email LIKE '%@mps.edu';
```

## ✅ Verify Users Work

After creating users:

1. Go to: http://localhost:3000/login
2. Try logging in with: `principal@mps.edu` / `MPS@2026`
3. Should work without 500 error!

---

**Remember:** NEVER create users with SQL INSERT. Always use:
- Supabase Dashboard UI
- Supabase Admin API (Node.js script)
- Signup form in your app
