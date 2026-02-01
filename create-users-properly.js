/**
 * Create Test Users Properly Using Supabase Admin API
 *
 * This script creates test users the RIGHT way - using Supabase Admin API
 * instead of SQL INSERT, which creates corrupted users.
 *
 * Usage:
 *   node create-users-properly.js
 *
 * Make sure you have your .env.local file set up first.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY // You need to add this!

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure you have:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (get from Supabase Dashboard → Settings → API)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  { email: 'principal@mps.edu', password: 'MPS@2026', fullName: 'Principal', role: 'principal' },
  { email: 'admin@mps.edu', password: 'MPS@2026', fullName: 'Admin', role: 'admin' },
  { email: 'teama_coordinator@mps.edu', password: 'MPS@2026', fullName: 'Team A Coordinator', role: 'coordinator' },
  { email: 'teama_teacher1@mps.edu', password: 'MPS@2026', fullName: 'Team A Teacher 1', role: 'teacher' },
  { email: 'teama_teacher2@mps.edu', password: 'MPS@2026', fullName: 'Team A Teacher 2', role: 'teacher' },
  { email: 'teamb_coordinator@mps.edu', password: 'MPS@2026', fullName: 'Team B Coordinator', role: 'coordinator' },
  { email: 'teamb_teacher1@mps.edu', password: 'MPS@2026', fullName: 'Team B Teacher 1', role: 'teacher' },
  { email: 'teamb_teacher2@mps.edu', password: 'MPS@2026', fullName: 'Team B Teacher 2', role: 'teacher' },
  { email: 'teamc_coordinator@mps.edu', password: 'MPS@2026', fullName: 'Team C Coordinator', role: 'coordinator' },
  { email: 'teamc_teacher1@mps.edu', password: 'MPS@2026', fullName: 'Team C Teacher 1', role: 'teacher' },
  { email: 'teamc_teacher2@mps.edu', password: 'MPS@2026', fullName: 'Team C Teacher 2', role: 'teacher' },
]

async function createUsers() {
  console.log('🚀 Creating test users...\n')

  for (const user of testUsers) {
    try {
      // Create user using Admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          role: user.role
        }
      })

      if (error) {
        console.error(`❌ Failed to create ${user.email}:`, error.message)
        continue
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role
        })

      if (profileError) {
        console.error(`❌ Failed to create profile for ${user.email}:`, profileError.message)
      } else {
        console.log(`✅ Created ${user.email} (${user.role})`)
      }
    } catch (err) {
      console.error(`❌ Error creating ${user.email}:`, err.message)
    }
  }

  console.log('\n✅ Done! All users created.')
  console.log('\nTest login with:')
  console.log('  Email: principal@mps.edu')
  console.log('  Password: MPS@2026')
}

createUsers()
