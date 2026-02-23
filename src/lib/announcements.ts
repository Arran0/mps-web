import { supabase, UserProfile, UserRole } from './supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 'student' | 'staff' | 'both' — derived from audience rows, stored for RLS */
export type AnnouncementType = 'student' | 'staff' | 'both'

export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  created_by: string
  created_at: string
  updated_at: string
}

export interface AnnouncementAudience {
  id: string
  announcement_id: string
  /** Set for student targeting */
  grade: number | null
  /** null = all sections of that grade */
  section: string | null
  /** true = targets all students school-wide */
  all_students: boolean
  /** Set for staff targeting (specific team) */
  team_id: string | null
  /** true = targets all staff school-wide */
  all_teams: boolean
  team?: { id: string; name: string } | null
}

export interface AnnouncementWithDetails extends Announcement {
  audiences: AnnouncementAudience[]
  creator?: UserProfile
}

/**
 * Input for creating a new announcement.
 * Each entry in `audiences` can describe either a student or staff audience row.
 * Multiple rows can be included to target multiple grades/sections/teams.
 */
export interface NewAnnouncementInput {
  title: string
  content: string
  audiences: {
    grade?: number
    section?: string       // undefined = all sections for that grade
    all_students?: boolean
    team_id?: string
    all_teams?: boolean
  }[]
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create an announcement with its audience rows.
 * The `type` ('student' | 'staff' | 'both') is derived automatically from the
 * audience entries so callers don't need to specify it.
 */
export async function createAnnouncement(
  input: NewAnnouncementInput,
  createdBy: string
): Promise<Announcement | null> {
  const announcementId = crypto.randomUUID()

  // Derive type from audiences
  const hasStudentAudience = input.audiences.some(a => a.grade != null || a.all_students)
  const hasStaffAudience   = input.audiences.some(a => a.team_id   || a.all_teams)
  const type: AnnouncementType =
    hasStudentAudience && hasStaffAudience ? 'both' :
    hasStaffAudience ? 'staff' : 'student'

  const { error: announcementError } = await supabase
    .from('announcements')
    .insert({
      id: announcementId,
      title: input.title,
      content: input.content,
      type,
      created_by: createdBy,
    })

  if (announcementError) {
    console.error('Failed to create announcement:', announcementError)
    return null
  }

  if (input.audiences.length > 0) {
    const audienceRows = input.audiences.map(a => ({
      announcement_id: announcementId,
      grade:        a.grade        ?? null,
      section:      a.section      ?? null,
      all_students: a.all_students ?? false,
      team_id:      a.team_id      ?? null,
      all_teams:    a.all_teams    ?? false,
    }))

    const { error: audienceError } = await supabase
      .from('announcement_audiences')
      .insert(audienceRows)

    if (audienceError) {
      console.error('Failed to create announcement audiences:', audienceError)
      // Rollback orphaned announcement
      await supabase.from('announcements').delete().eq('id', announcementId)
      return null
    }
  }

  return {
    id: announcementId,
    title: input.title,
    content: input.content,
    type,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/** Delete an announcement (cascade removes audience rows). */
export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) {
    throw new Error(`Failed to delete announcement: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers (shared select fragment)
// ---------------------------------------------------------------------------

const ANNOUNCEMENT_SELECT = `
  *,
  audiences:announcement_audiences(*, team:teams(id, name)),
  creator:profiles!announcements_created_by_fkey(*)
` as const

/**
 * Fetch all announcements visible to the current user.
 *
 * Visibility rules (enforced both by RLS and client-side logic):
 *   - coordinator / principal / admin → see ALL announcements
 *   - teacher → sees 'staff' and 'both' announcements that target their team
 *               or have all_teams = true
 *   - student  → sees 'student' and 'both' announcements that target their
 *               grade/section (or have all_students = true)
 */
export async function fetchAnnouncementsForUser(
  userId: string,
  userRole: UserRole,
  userGrade?: number,
  userSection?: string
): Promise<AnnouncementWithDetails[]> {

  // ── Coordinator / Principal / Admin: see everything ─────────────────────
  if (['coordinator', 'principal', 'admin'].includes(userRole)) {
    const { data, error } = await supabase
      .from('announcements')
      .select(ANNOUNCEMENT_SELECT)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch announcements: ${error.message}`)
    return (data ?? []) as AnnouncementWithDetails[]
  }

  // ── Teacher: staff (or 'both') announcements for their teams ─────────────
  if (userRole === 'teacher') {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)

    const teamIds = (memberships ?? []).map(m => m.team_id)

    // Build OR filter: all_teams = true OR team_id in user's teams
    const orFilter = teamIds.length > 0
      ? `all_teams.eq.true,team_id.in.(${teamIds.join(',')})`
      : `all_teams.eq.true`

    const { data: matchingAudiences, error: audienceError } = await supabase
      .from('announcement_audiences')
      .select('announcement_id')
      .or(orFilter)

    if (audienceError) throw new Error(`Failed to fetch audiences: ${audienceError.message}`)

    const ids = [...new Set((matchingAudiences ?? []).map(a => a.announcement_id))]
    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('announcements')
      .select(ANNOUNCEMENT_SELECT)
      .in('id', ids)
      .in('type', ['staff', 'both'])
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch announcements: ${error.message}`)
    return (data ?? []) as AnnouncementWithDetails[]
  }

  // ── Student: student (or 'both') announcements for their grade/section ───
  if (userRole === 'student' && userGrade != null) {
    // Collect matching announcement IDs from two types of audience rows:
    const matchedIds = new Set<string>()

    // 1. Rows with all_students = true
    const { data: allStudentRows } = await supabase
      .from('announcement_audiences')
      .select('announcement_id')
      .eq('all_students', true)
    ;(allStudentRows ?? []).forEach(r => matchedIds.add(r.announcement_id))

    // 2. Rows targeting this grade + matching section (null section = all sections)
    const sectionFilter = userSection
      ? `section.is.null,section.eq.${userSection}`
      : `section.is.null`

    const { data: gradeRows } = await supabase
      .from('announcement_audiences')
      .select('announcement_id')
      .eq('grade', userGrade)
      .or(sectionFilter)
    ;(gradeRows ?? []).forEach(r => matchedIds.add(r.announcement_id))

    const ids = Array.from(matchedIds)
    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('announcements')
      .select(ANNOUNCEMENT_SELECT)
      .in('id', ids)
      .in('type', ['student', 'both'])
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch announcements: ${error.message}`)
    return (data ?? []) as AnnouncementWithDetails[]
  }

  return []
}

// ---------------------------------------------------------------------------
// Team helpers (used by the create form)
// ---------------------------------------------------------------------------

/** Fetch the teams a specific user belongs to. */
export async function fetchTeamsForUser(
  userId: string
): Promise<{ id: string; name: string }[]> {
  const { data: memberships, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to fetch team memberships: ${error.message}`)
  if (!memberships || memberships.length === 0) return []

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', memberships.map(m => m.team_id))
    .order('name', { ascending: true })

  if (teamsError) throw new Error(`Failed to fetch teams: ${teamsError.message}`)
  return (teams ?? []) as { id: string; name: string }[]
}

/** Fetch all teams — for principal / admin audience pickers. */
export async function fetchAllTeams(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch all teams:', error)
    return []
  }
  return (data ?? []) as { id: string; name: string }[]
}
