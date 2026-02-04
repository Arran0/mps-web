import { supabase, UserProfile, UserRole } from './supabase'
import { TaskStatus, TaskTag } from './tasks'

// ============================================
// Types
// ============================================

export interface Project {
  id: string
  title: string
  description: string | null
  start_date: string | null
  end_date: string | null
  sequential_mode: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  user?: UserProfile
}

export interface Subtask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  timing: string | null
  tag: TaskTag | null
  assignee_id: string | null
  assignee?: UserProfile
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProjectWithDetails extends Project {
  members: ProjectMember[]
  subtasks: Subtask[]
}

export interface NewProjectInput {
  title: string
  description?: string
  start_date?: string
  end_date?: string
  sequential_mode?: boolean
  member_ids: string[]
}

export interface NewSubtaskInput {
  title: string
  description?: string
  due_date?: string
  timing?: string
  tag?: TaskTag
  assignee_id?: string
  sort_order?: number
}

// ============================================
// Project CRUD
// ============================================

export async function createProject(
  input: NewProjectInput,
  createdBy: string
): Promise<Project | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title: input.title,
      description: input.description || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      sequential_mode: input.sequential_mode ?? false,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !project) {
    console.error('Error creating project:', error)
    return null
  }

  // Ensure creator is always a member
  const memberIds = new Set(input.member_ids)
  memberIds.add(createdBy)

  const memberRecords = Array.from(memberIds).map(uid => ({
    project_id: project.id,
    user_id: uid,
  }))

  const { error: membersError } = await supabase
    .from('project_members')
    .insert(memberRecords)

  if (membersError) {
    console.error('Error inserting project members:', membersError)
  }

  return project as Project
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, 'title' | 'description' | 'start_date' | 'end_date' | 'sequential_mode'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)

  if (error) {
    console.error('Error updating project:', error)
    return false
  }
  return true
}

export async function deleteProject(projectId: string): Promise<boolean> {
  // Subtasks and members will be cascade-deleted by FK constraints
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    return false
  }
  return true
}

// ============================================
// Subtask CRUD
// ============================================

export async function addSubtask(
  projectId: string,
  input: NewSubtaskInput
): Promise<Subtask | null> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({
      project_id: projectId,
      title: input.title,
      description: input.description || null,
      due_date: input.due_date || null,
      timing: input.timing || null,
      tag: input.tag || null,
      assignee_id: input.assignee_id || null,
      sort_order: input.sort_order ?? 0,
    })
    .select('*, assignee:profiles!subtasks_assignee_id_fkey(*)')
    .single()

  if (error || !data) {
    console.error('Error adding subtask:', error)
    return null
  }

  return data as Subtask
}

export async function updateSubtaskStatus(
  subtaskId: string,
  status: TaskStatus,
  projectId: string,
  sequentialMode: boolean
): Promise<{ success: boolean; error?: string }> {
  if (sequentialMode) {
    // Fetch the subtask to get its sort_order
    const { data: currentSubtask, error: fetchError } = await supabase
      .from('subtasks')
      .select('sort_order')
      .eq('id', subtaskId)
      .single()

    if (fetchError || !currentSubtask) {
      return { success: false, error: 'Could not fetch subtask' }
    }

    // Check if there is a previous subtask that is not done/checked
    if (currentSubtask.sort_order > 0) {
      const { data: previousSubtasks, error: prevError } = await supabase
        .from('subtasks')
        .select('id, status, sort_order')
        .eq('project_id', projectId)
        .lt('sort_order', currentSubtask.sort_order)
        .order('sort_order', { ascending: false })
        .limit(1)

      if (prevError) {
        return { success: false, error: 'Could not verify sequential order' }
      }

      if (previousSubtasks && previousSubtasks.length > 0) {
        const prev = previousSubtasks[0]
        if (prev.status !== 'done' && prev.status !== 'checked') {
          return { success: false, error: 'Complete previous subtask first' }
        }
      }
    }
  }

  const { error } = await supabase
    .from('subtasks')
    .update({ status })
    .eq('id', subtaskId)

  if (error) {
    console.error('Error updating subtask status:', error)
    return { success: false, error: 'Failed to update status' }
  }

  return { success: true }
}

export async function deleteSubtask(subtaskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId)

  if (error) {
    console.error('Error deleting subtask:', error)
    return false
  }
  return true
}

// ============================================
// Project queries
// ============================================

export async function fetchProjectsForUser(
  userId: string,
  userRole: UserRole
): Promise<ProjectWithDetails[]> {
  let projectIds: string[] = []

  if (userRole === 'principal' || userRole === 'admin') {
    // Principals and admins see all projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !projects) return []

    return enrichProjects(projects as Project[])
  }

  if (userRole === 'coordinator') {
    // Coordinators see projects where any team member is involved
    // First get the coordinator's team members
    const { data: myTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)

    if (!myTeams || myTeams.length === 0) {
      // Fall back to just projects where the coordinator is a member
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)

      projectIds = (memberships || []).map(m => m.project_id)
    } else {
      const teamIds = myTeams.map(t => t.team_id)

      // Get all users in those teams
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds)

      const teamUserIds = [...new Set((teamMembers || []).map(m => m.user_id))]

      // Get projects where any team member is involved
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .in('user_id', teamUserIds)

      projectIds = [...new Set((memberships || []).map(m => m.project_id))]
    }
  } else {
    // Teachers: only projects they are a member of
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)

    projectIds = (memberships || []).map(m => m.project_id)
  }

  if (projectIds.length === 0) return []

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .order('created_at', { ascending: false })

  if (error || !projects) return []

  return enrichProjects(projects as Project[])
}

export async function fetchProjectById(
  projectId: string
): Promise<ProjectWithDetails | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    console.error('Error fetching project:', error)
    return null
  }

  const enriched = await enrichProjects([project as Project])
  return enriched.length > 0 ? enriched[0] : null
}

export async function fetchSubtasksForCalendar(
  userId: string
): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*, assignee:profiles!subtasks_assignee_id_fkey(*)')
    .eq('assignee_id', userId)
    .order('due_date', { ascending: true })

  if (error || !data) {
    console.error('Error fetching subtasks for calendar:', error)
    return []
  }

  return data as Subtask[]
}

// ============================================
// Helpers
// ============================================

async function enrichProjects(projects: Project[]): Promise<ProjectWithDetails[]> {
  if (projects.length === 0) return []

  const projectIds = projects.map(p => p.id)

  // Fetch all members for these projects
  const { data: allMembers } = await supabase
    .from('project_members')
    .select('*, user:profiles(*)')
    .in('project_id', projectIds)

  // Fetch all subtasks for these projects
  const { data: allSubtasks } = await supabase
    .from('subtasks')
    .select('*, assignee:profiles!subtasks_assignee_id_fkey(*)')
    .in('project_id', projectIds)
    .order('sort_order', { ascending: true })

  return projects.map(project => ({
    ...project,
    members: (allMembers || []).filter(m => m.project_id === project.id) as ProjectMember[],
    subtasks: (allSubtasks || []).filter(s => s.project_id === project.id) as Subtask[],
  }))
}
