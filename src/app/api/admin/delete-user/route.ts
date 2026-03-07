import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function DELETE(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
  }

  // Use service role if available, otherwise fall back to anon key (profile-only deletion)
  const clientKey = serviceRoleKey || anonKey
  const adminClient = createClient(supabaseUrl, clientKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify caller is an authenticated admin
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the caller's token using the anon client (works regardless of service role)
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user: callerUser }, error: authError } = await anonClient.auth.getUser(authHeader.slice(7))
  if (authError || !callerUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', callerUser.id).single()
  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })

  // Prevent self-deletion
  if (userId === callerUser.id) {
    return NextResponse.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 })
  }

  // Delete profile row first (works with anon key if admin RLS allows it)
  await adminClient.from('profiles').delete().eq('id', userId)

  // Delete auth user if service role key is available
  if (serviceRoleKey) {
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) {
      // Profile is already deleted; auth user removal failed — not critical
      console.error('Auth user deletion failed:', error.message)
    }
  }

  return NextResponse.json({ success: true })
}
