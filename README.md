# MPS Web - Muthamil Public School Management System

A modern, beautiful educational management system built with Next.js, Supabase, and Tailwind CSS.

![MPS Web](https://img.shields.io/badge/MPS-Web-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4)

## 🎨 Features

- **Role-based Authentication**: Students, Teachers, Coordinators, Principals, and Admins
- **Beautiful UI**: Light blue, light green, and white color theme
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Protected Routes**: Staff-only pages are hidden from students
- **Modern Animations**: Smooth transitions with Framer Motion

## 📁 Directory Structure

```
mps-web/
├── public/                     # Static files (add your logo here)
├── src/
│   ├── app/
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Root page (redirect)
│   │   ├── login/
│   │   │   └── page.tsx        # Login/Signup page
│   │   ├── home/
│   │   │   └── page.tsx        # Home dashboard
│   │   ├── profile/
│   │   │   └── page.tsx        # User profile
│   │   ├── tasks/
│   │   │   └── page.tsx        # Task Manager (staff only)
│   │   ├── academics/
│   │   │   ├── page.tsx        # Academics main page
│   │   │   ├── homework/
│   │   │   │   └── page.tsx    # Homework management
│   │   │   ├── coursework/
│   │   │   │   └── page.tsx    # Coursework management
│   │   │   └── grades/
│   │   │       └── page.tsx    # Grades
│   │   └── more/
│   │       ├── page.tsx        # More services main page
│   │       ├── fees/
│   │       │   └── page.tsx    # Fee manager
│   │       ├── bus/
│   │       │   └── page.tsx    # School bus manager
│   │       └── leave/
│   │           └── page.tsx    # Leave manager
│   ├── components/
│   │   ├── Navbar.tsx          # Navigation bar
│   │   ├── ProtectedLayout.tsx # Auth protection wrapper
│   │   └── UnderConstruction.tsx # Placeholder component
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication context
│   ├── lib/
│   │   └── supabase.ts         # Supabase client & utilities
│   └── types/                  # TypeScript types
├── .env.local                  # Environment variables
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🚀 Setup Instructions

### Step 1: Set up Supabase Database

**IMPORTANT:** You must complete this step first or you'll get "Database error querying schema" when trying to sign in.

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/tgxxqzeaqxiwoqzopcku

2. Navigate to **SQL Editor** in the left sidebar

3. **Complete Database Setup** (Run this to fix all database errors):
   - Open `supabase-complete-rebuild.sql` from your project folder
   - This creates all tables, RLS policies, triggers, and test users
   - Copy and paste the **entire file** into SQL Editor
   - Click **Run** or press Cmd/Ctrl + Enter
   - Wait for "Success" message

4. **CRITICAL - After running SQL:**
   - Go to **Settings → General → Restart Project**
   - Wait ~30 seconds for restart to complete
   - Clear your browser cache/localStorage (or open Incognito)
   - Then try signing in

**Old Method** (if you prefer manual setup, run the SQL below):

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'coordinator', 'principal', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
```

### Step 2: Install Dependencies Locally

Open Terminal on your Mac and navigate to your project:

```bash
cd ~/Projects/mps-web
npm install
```

### Step 3: Create Environment File

Make sure your `.env.local` file exists with:

```
NEXT_PUBLIC_SUPABASE_URL=https://tgxxqzeaqxiwoqzopcku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneHhxemVhcXhpd29xem9wY2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzE2MjIsImV4cCI6MjA4NTQ0NzYyMn0.gheXa7WzE6jR8XFt3g2GnzDU9VdjZKaMWlJofJf956Y
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Step 5: Deploy to Vercel + GitHub

1. **Initialize Git Repository**:
```bash
cd ~/Projects/mps-web
git init
git add .
git commit -m "Initial commit: MPS Web setup"
```

2. **Create GitHub Repository**:
   - Go to https://github.com/new
   - Name it `mps-web`
   - Don't initialize with README (we already have one)
   - Click "Create repository"

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/Arran0/mps-web.git
git branch -M main
git push -u origin main
```

4. **Deploy on Vercel**:
   - Go to https://vercel.com/arrans-projects-11f91c15
   - Click "Add New" → "Project"
   - Import your `mps-web` repository from GitHub
   - Add Environment Variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click "Deploy"

## 🎯 User Roles

| Role | Access Level |
|------|--------------|
| Student | Basic access - Academics, More services |
| Teacher | Staff access - All above + Task Manager |
| Coordinator | Staff access - All above + Task Manager |
| Principal | Staff access - All above + Task Manager |
| Admin | Full access - Everything |

## 🎨 Adding Your School Logo

1. Add your logo file to `public/` folder (e.g., `public/logo.png`)
2. Update the logo in `src/components/Navbar.tsx`:

```tsx
// Replace the logo-placeholder div with:
<Image 
  src="/logo.png" 
  alt="MPS Logo" 
  width={48} 
  height={48} 
  className="rounded-xl"
/>
```

Don't forget to import Image:
```tsx
import Image from 'next/image'
```

## 🔄 Development Workflow

1. Make changes locally
2. Test at http://localhost:3000
3. Commit and push to GitHub:
```bash
git add .
git commit -m "Your commit message"
git push
```
4. Vercel will automatically deploy the changes

## 📝 Next Steps

Once the basic setup is working, we can implement:
- Task Manager functionality
- Homework submission system
- Grade management
- Fee payment integration
- Bus tracking
- Leave application system

## 🆘 Troubleshooting

**"Database error querying schema" when signing in**
This is the most common error and happens when the profiles table doesn't exist or has incorrect RLS policies.

**COMPLETE FIX:**
1. Go to your Supabase project: https://supabase.com/dashboard/project/tgxxqzeaqxiwoqzopcku
2. Click **SQL Editor** in the left sidebar
3. Open the `supabase-complete-rebuild.sql` file from your project
4. Copy the **entire content** and paste it into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for "Success" message
7. **CRITICAL:** Go to **Settings → General → Restart Project** (wait ~30 seconds)
8. Clear your browser cache/localStorage or use Incognito mode
9. Try logging in with test account: `principal@mps.edu` / `MPS@2026`

**What the SQL does:**
- Drops all existing tables and recreates them fresh
- Creates `profiles` table with proper RLS policies
- Creates `teams`, `tasks`, and related tables
- Adds 11 test user accounts (1 principal, 1 admin, 9 staff members)
- Sets up triggers for automatic profile creation
- Configures JWT-based role checking to avoid circular dependencies

**"npm: command not found"**
- Install Node.js from https://nodejs.org/

**Supabase authentication errors**
- Check that your environment variables are correct in `.env.local`
- Make sure both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify the values match your Supabase project settings

**Vercel deployment fails**
- Check that all environment variables are set in Vercel dashboard
- Review build logs for specific errors
- Make sure you've run the database setup SQL in Supabase

---

Built with ❤️ for Muthamil Public School
