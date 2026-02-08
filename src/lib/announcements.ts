import { supabase, UserProfile, UserRole } from './supabase'

// --- Types ---

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'student' | 'staff'
  created_by: string
  created_at: string
  updated_at: string
}

export interface AnnouncementAudience {
  id: string
  announcement_id: string
  grade: number | null
  section: string | null
  team_id: string | null
  all_teams: boolean
  team?: { id: string; name: string } | null
}

export interface AnnouncementWithDetails extends Announcement {
  audiences: AnnouncementAudience[]
  creator?: UserProfile
}

export interface NewAnnouncementInput {
  title: string
  content: string
  type: 'student' | 'staff'
  audiences: {
    grade?: number
    section?: string
    team_id?: string
    all_teams?: boolean
  }[]
}

// --- CRUD Functions ---

/**
 * Create an announcement with its audience targets.
 * Inserts the announcement row first, then bulk-inserts all audience rows.
 * Returns the created announcement, or null if an error occurred.
 */
export async function createAnnouncement(
  input: NewAnnouncementInput,
  createdBy: string
): Promise<Announcement | null> {
  // 1. Insert the announcement (no join — audiences don't exist yet)
  const { data: announcement, error: announcementError } = await supabase
    .from('announcements')
    .insert({
      title: input.title,
      content: input.content,
      type: input.type,
      created_by: createdBy,
    })
    .select('*')
    .single()

  if (announcementError || !announcement) {
    console.error('Failed to create announcement:', announcementError?.message, announcementError?.details, announcementError?.hint, announcementError?.code)
    return null
  }

  // 2. Insert audience rows separately
  if (input.audiences.length > 0) {
    const audienceRows = input.audiences.map((a) => ({
      announcement_id: announcement.id,
      grade: a.grade ?? null,
      section: a.section ?? null,
      team_id: a.team_id ?? null,
      all_teams: a.all_teams ?? false,
    }))

    const { error: audienceError } = await supabase
      .from('announcement_audiences')
      .insert(audienceRows)

    if (audienceError) {
      console.error('Failed to create announcement audiences:', audienceError.message, audienceError.details, audienceError.hint, audienceError.code)
      // Roll back: delete the orphaned announcement
      await supabase.from('announcements').delete().eq('id', announcement.id)
      return null
    }
  }

  return announcement as Announcement
}

/**
 * Delete an announcement by ID.
 * The audience rows are removed automatically via ON DELETE CASCADE.
 */
export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) {
    throw new Error(`Failed to delete announcement: ${error.message}`)
  }
}

/**
 * Fetch student-type announcements visible to a particular student.
 *
 * An announcement matches when ANY of its audience rows satisfies:
 *   - grade matches AND (section matches OR audience section is null meaning "all sections")
 */
export async function fetchStudentAnnouncements(
  grade: number,
  section: string
): Promise<AnnouncementWithDetails[]> {
  // Step 1: Find audience rows that target this student's grade/section
  const { data: matchingAudiences, error: audienceError } = await supabase
    .from('announcement_audiences')
    .select('announcement_id')
    .eq('grade', grade)
    .or(`section.eq.${section},section.is.null`)

  if (audienceError) {
    throw new Error(
      `Failed to fetch student announcement audiences: ${audienceError.message}`
    )
  }

  if (!matchingAudiences || matchingAudiences.length === 0) {
    return []
  }

  const announcementIds = [
    ...new Set(matchingAudiences.map((a) => a.announcement_id)),
  ]

  // Step 2: Fetch the full announcements with audiences and creator
  const { data: announcements, error: announcementsError } = await supabase
    .from('announcements')
    .select(
      `*,
      audiences:announcement_audiences(*, team:teams(id, name)),
      creator:profiles!announcements_created_by_fkey(*)`
    )
    .in('id', announcementIds)
    .eq('type', 'student')
    .order('created_at', { ascending: false })

  if (announcementsError) {
    throw new Error(
      `Failed to fetch student announcements: ${announcementsError.message}`
    )
  }

  return (announcements ?? []) as AnnouncementWithDetails[]
}

/**
 * Fetch staff-type announcements visible to a given staff member.
 *
 * - Teachers see staff announcements whose audience targets one of their teams
 *   OR has all_teams = true.
 * - Coordinators, principals, and admins see ALL staff announcements.
 */
export async function fetchStaffAnnouncements(
  userId: string,
  userRole: UserRole
): Promise<AnnouncementWithDetails[]> {
  // Coordinators, principals, and admins see everything
  if (['coordinator', 'principal', 'admin'].includes(userRole)) {
    const { data, error } = await supabase
      .from('announcements')
      .select(
        `*,
        audiences:announcement_audiences(*, team:teams(id, name)),
        creator:profiles!announcements_created_by_fkey(*)`
      )
      .eq('type', 'staff')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(
        `Failed to fetch staff announcements: ${error.message}`
      )
    }

    return (data ?? []) as AnnouncementWithDetails[]
  }

  // Teachers: find their team IDs first
  const { data: userTeams, error: teamsError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)

  if (teamsError) {
    throw new Error(
      `Failed to fetch user teams: ${teamsError.message}`
    )
  }

  const teamIds = (userTeams ?? []).map((t) => t.team_id)

  // Find audiences that target the user's teams OR all staff
  const orFilter = teamIds.length > 0
    ? `all_teams.eq.true,team_id.in.(${teamIds.join(',')})`
    : `all_teams.eq.true`

  const { data: matchingAudiences, error: audienceError } = await supabase
    .from('announcement_audiences')
    .select('announcement_id')
    .or(orFilter)

  if (audienceError) {
    throw new Error(
      `Failed to fetch staff announcement audiences: ${audienceError.message}`
    )
  }

  if (!matchingAudiences || matchingAudiences.length === 0) {
    return []
  }

  const announcementIds = [
    ...new Set(matchingAudiences.map((a) => a.announcement_id)),
  ]

  const { data: announcements, error: announcementsError } = await supabase
    .from('announcements')
    .select(
      `*,
      audiences:announcement_audiences(*, team:teams(id, name)),
      creator:profiles!announcements_created_by_fkey(*)`
    )
    .in('id', announcementIds)
    .eq('type', 'staff')
    .order('created_at', { ascending: false })

  if (announcementsError) {
    throw new Error(
      `Failed to fetch staff announcements: ${announcementsError.message}`
    )
  }

  return (announcements ?? []) as AnnouncementWithDetails[]
}

/**
 * Fetch ALL student-type announcements (no audience filtering).
 * Used by staff (teachers, coordinators, principals, admins) to see
 * every student announcement that has been posted.
 */
export async function fetchStudentAnnouncementsForStaff(): Promise<
  AnnouncementWithDetails[]
> {
  const { data, error } = await supabase
    .from('announcements')
    .select(
      `*,
      audiences:announcement_audiences(*, team:teams(id, name)),
      creator:profiles!announcements_created_by_fkey(*)`
    )
    .eq('type', 'student')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(
      `Failed to fetch student announcements for staff: ${error.message}`
    )
  }

  return (data ?? []) as AnnouncementWithDetails[]
}

/**
 * Fetch the teams a user belongs to (id and name).
 * Useful for building the audience picker in the announcement creation form.
 */
export async function fetchTeamsForUser(
  userId: string
): Promise<{ id: string; name: string }[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)

  if (membershipsError) {
    throw new Error(
      `Failed to fetch team memberships: ${membershipsError.message}`
    )
  }

  if (!memberships || memberships.length === 0) {
    return []
  }

  const teamIds = memberships.map((m) => m.team_id)

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', teamIds)
    .order('name', { ascending: true })

  if (teamsError) {
    throw new Error(`Failed to fetch teams: ${teamsError.message}`)
  }

  return (teams ?? []) as { id: string; name: string }[]
}

/**
 * Fetch all teams (for principals and admins).
 */
export async function fetchAllTeams(): Promise<{ id: string; name: string }[]> {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch all teams:', error)
    return []
  }

  return (teams ?? []) as { id: string; name: string }[]
}
