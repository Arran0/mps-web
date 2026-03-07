import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This route requires SUPABASE_SERVICE_ROLE_KEY in environment variables
// Get it from: Supabase Dashboard → Project Settings → API → service_role secret

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set' },
      { status: 500 }
    )
  }

  // Create admin client with service role key
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the caller is an authenticated admin
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const callerToken = authHeader.slice(7)
  const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(callerToken)
  if (authError || !callerUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Check caller role
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerUser.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  // Parse request body
  const body = await request.json()
  const { email, full_name, role, grade, section } = body

  if (!email || !full_name || !role) {
    return NextResponse.json({ success: false, error: 'email, full_name, and role are required' }, { status: 400 })
  }

  try {
    // Determine the site's public URL for the redirect link in the invite email.
    // Priority: NEXT_PUBLIC_SITE_URL env var → request Origin header → Supabase URL (fallback).
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      request.headers.get('origin') ||
      supabaseUrl

    // Invite user by email — sends a password-setup / account-activation link
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { role, full_name },
      redirectTo: `${siteUrl}/update-password`,
    })

    if (inviteError) {
      // If user already exists, try creating with generateLink instead
      if (inviteError.message?.includes('already been registered')) {
        return NextResponse.json({ success: false, error: 'A user with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: inviteError.message }, { status: 400 })
    }

    const newUserId = inviteData.user?.id
    if (!newUserId) {
      return NextResponse.json({ success: false, error: 'Failed to get user ID after invite' }, { status: 500 })
    }

    // Upsert profile with the correct role
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        role,
        grade: grade ? parseInt(grade) : null,
        section: section || null,
      })

    if (profileError) {
      console.error('Profile upsert failed:', profileError)
      // Not a fatal error — profile trigger may handle it
    }

    return NextResponse.json({ success: true, userId: newUserId })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ success: false, error: 'Unexpected server error' }, { status: 500 })
  }
}
