import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function DELETE(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify caller is an authenticated admin
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(authHeader.slice(7))
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

  // Delete auth user (cascades to profile via DB trigger/FK)
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

  // Also delete profile row (in case FK cascade isn't set up)
  await adminClient.from('profiles').delete().eq('id', userId)

  return NextResponse.json({ success: true })
}
