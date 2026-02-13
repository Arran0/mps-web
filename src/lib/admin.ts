import { supabase, UserProfile, UserRole } from './supabase'

// ============================================
// Admin Functions for User Management
// ============================================

export interface ProfileWithTeams extends UserProfile {
  teams: { id: string; name: string }[]
}

export interface NewUserInput {
  email: string
  full_name: string
  role: UserRole
  grade?: number
  section?: string
  team_ids?: string[]
}

// Fetch all profiles with team memberships
export async function fetchAllProfiles(): Promise<ProfileWithTeams[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Failed to fetch profiles:', error)
    return []
  }

  // Fetch team memberships for all users
  const userIds = profiles?.map(p => p.id) || []

  const { data: memberships } = await supabase
    .from('team_members')
    .select('user_id, team:teams(id, name)')
    .in('user_id', userIds)

  // Map memberships to users
  const membershipMap = new Map<string, { id: string; name: string }[]>()
  for (const m of memberships || []) {
    if (!membershipMap.has(m.user_id)) {
      membershipMap.set(m.user_id, [])
    }
    const team = m.team as unknown as { id: string; name: string } | null
    if (team) {
      membershipMap.get(m.user_id)!.push(team)
    }
  }

  return (profiles || []).map(p => ({
    ...p,
    teams: membershipMap.get(p.id) || [],
  })) as ProfileWithTeams[]
}

// Update profile
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'role' | 'grade' | 'section'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    console.error('Failed to update profile:', error)
    return false
  }

  return true
}

// Update team memberships for a user
export async function updateTeamMemberships(
  userId: string,
  teamIds: string[]
): Promise<boolean> {
  // First, remove all existing memberships
  const { error: deleteError } = await supabase
    .from('team_members')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Failed to remove team memberships:', deleteError)
    return false
  }

  // Then add new memberships
  if (teamIds.length > 0) {
    const records = teamIds.map(teamId => ({
      team_id: teamId,
      user_id: userId,
    }))

    const { error: insertError } = await supabase
      .from('team_members')
      .insert(records)

    if (insertError) {
      console.error('Failed to add team memberships:', insertError)
      return false
    }
  }

  return true
}

// Fetch all teams
export async function fetchAllTeams(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch teams:', error)
    return []
  }

  return data || []
}

// Create a new user with auth and profile
export async function createNewUser(input: NewUserInput): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!'

    // Create auth user using Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: input.role,
        full_name: input.full_name,
      },
    })

    if (authError || !authData.user) {
      console.error('Failed to create auth user:', authError)
      return { success: false, error: authError?.message || 'Failed to create user' }
    }

    // Update the profile (it should be created automatically via trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: input.full_name,
        role: input.role,
        grade: input.grade || null,
        section: input.section || null,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Failed to update profile:', profileError)
      // Continue anyway, profile might not exist yet
    }

    // Set team memberships if provided
    if (input.team_ids && input.team_ids.length > 0) {
      await updateTeamMemberships(authData.user.id, input.team_ids)
    }

    // Send password reset email so user can set their own password
    await supabase.auth.resetPasswordForEmail(input.email)

    return { success: true, userId: authData.user.id }
  } catch (err) {
    console.error('Error creating user:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Note: Creating auth users requires Supabase Admin API
// For now, this function creates only the profile (user must sign up via auth first)
// In production, you'd use Supabase Admin API to create auth.users
export async function createProfileForExistingAuth(
  userId: string,
  input: Omit<NewUserInput, 'email'>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name,
      role: input.role,
      grade: input.grade || null,
      section: input.section || null,
    })
    .eq('id', userId)

  if (error) {
    console.error('Failed to create/update profile:', error)
    return false
  }

  // Set team memberships
  if (input.team_ids && input.team_ids.length > 0) {
    await updateTeamMemberships(userId, input.team_ids)
  }

  return true
}

// Get role display info
export const ROLE_COLORS: Record<UserRole, string> = {
  student: 'bg-green-100 text-green-700 border-green-200',
  teacher: 'bg-blue-100 text-blue-700 border-blue-200',
  coordinator: 'bg-purple-100 text-purple-700 border-purple-200',
  principal: 'bg-amber-100 text-amber-700 border-amber-200',
  admin: 'bg-red-100 text-red-700 border-red-200',
}
