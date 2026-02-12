// Quick test script to check announcements in database
// Run with: node test-announcements.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tgxxqzeaqxiwoqzopcku.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneHhxemVhcXhpd29xem9wY2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzE2MjIsImV4cCI6MjA4NTQ0NzYyMn0.gheXa7WzE6jR8XFt3g2GnzDU9VdjZKaMWlJofJf956Y'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAnnouncements() {
  console.log('\n=== Testing Announcements ===\n')

  // Test 1: Count all announcements (without RLS - using service role would be needed)
  console.log('1. Attempting to fetch announcements...')
  const { data: announcements, error: announcementsError } = await supabase
    .from('announcements')
    .select('*')

  if (announcementsError) {
    console.error('Error fetching announcements:', announcementsError)
  } else {
    console.log(`Found ${announcements?.length || 0} announcements (filtered by RLS)`)
    if (announcements && announcements.length > 0) {
      console.log('Sample announcement:', announcements[0])
    }
  }

  // Test 2: Check announcement_audiences
  console.log('\n2. Attempting to fetch announcement audiences...')
  const { data: audiences, error: audiencesError } = await supabase
    .from('announcement_audiences')
    .select('*')

  if (audiencesError) {
    console.error('Error fetching audiences:', audiencesError)
  } else {
    console.log(`Found ${audiences?.length || 0} audience records`)
    if (audiences && audiences.length > 0) {
      console.log('Sample audience:', audiences[0])
    }
  }

  // Test 3: Check current auth user
  console.log('\n3. Checking current auth state...')
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('Not authenticated:', userError.message)
  } else if (user) {
    console.log('Authenticated as:', user.id, user.email)

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
    } else {
      console.log('Profile:', profile)
    }
  } else {
    console.log('Not authenticated - RLS will block all queries')
    console.log('This is expected when running from Node.js')
    console.log('Please check the browser console when logged in')
  }

  console.log('\n=== Test Complete ===\n')
}

testAnnouncements().catch(console.error)
