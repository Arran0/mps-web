import { supabase, UserProfile, UserRole } from './supabase'

// ============================================
// Types
// ============================================

export type TaskStatus = 'not_done' | 'partial' | 'done' | 'checked'
export type TaskTag = 'bonus' | null
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  is_overdue: boolean
  due_date: string | null
  timing: string | null
  tag: TaskTag
  recurrence: TaskRecurrence
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskAssignee {
  id: string
  task_id: string
  user_id: string
}

export interface TaskChecklistItem {
  id: string
  task_id: string
  text: string
  is_completed: boolean
  sort_order: number
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user?: UserProfile
}

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  created_at: string
  user?: UserProfile
}

export interface TaskWithDetails extends Task {
  assignees: (TaskAssignee & { user?: UserProfile })[]
  checklist: TaskChecklistItem[]
  comments: TaskComment[]
}

export interface NewTaskInput {
  title: string
  description?: string
  due_date?: string
  timing?: string
  tag?: TaskTag
  recurrence?: TaskRecurrence
  assignee_ids: string[]
  checklist_items?: string[]
}

export interface TaskFilter {
  status?: TaskStatus
  is_overdue?: boolean
  due_date_from?: string
  due_date_to?: string
}

// ============================================
// Status helpers
// ============================================

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_done: 'Not Done',
  partial: 'Partial',
  done: 'Done',
  checked: 'Checked',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_done: 'bg-red-100 text-red-700 border-red-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  done: 'bg-green-100 text-green-700 border-green-200',
  checked: 'bg-blue-100 text-blue-700 border-blue-200',
}

export const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  not_done: 'bg-red-500',
  partial: 'bg-amber-500',
  done: 'bg-green-500',
  checked: 'bg-blue-500',
}

export const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  none: 'No Repeat',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export function getNextStatus(current: TaskStatus, canCheck: boolean): TaskStatus {
  if (current === 'not_done') return 'partial'
  if (current === 'partial') return 'done'
  if (current === 'done' && canCheck) return 'checked'
  if (current === 'done' && !canCheck) return 'not_done' // cycle back for teachers
  if (current === 'checked') return 'not_done' // cycle back for coordinators+
  return current
}

// ============================================
// Task CRUD
// ============================================

export async function createTask(input: NewTaskInput, createdBy: string): Promise<Task | null> {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      due_date: input.due_date || null,
      timing: input.timing || null,
      tag: input.tag || null,
      recurrence: input.recurrence || 'none',
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !task) {
    console.error('Error creating task:', error)
    return null
  }

  // Insert assignees
  if (input.assignee_ids.length > 0) {
    const assigneeRecords = input.assignee_ids.map(uid => ({
      task_id: task.id,
      user_id: uid,
    }))
    await supabase.from('task_assignees').insert(assigneeRecords)
  }

  // Insert checklist items
  if (input.checklist_items && input.checklist_items.length > 0) {
    const checklistRecords = input.checklist_items.map((text, i) => ({
      task_id: task.id,
      text,
      sort_order: i,
    }))
    await supabase.from('task_checklist_items').insert(checklistRecords)
  }

  return task as Task
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) {
    console.error('Error updating task status:', error)
    return false
  }

  // When a recurring task is marked "checked", auto-create the next occurrence
  if (status === 'checked') {
    await spawnNextRecurrence(taskId)
  }

  return true
}

/** Build a YYYY-MM-DD string from parts, letting Date handle overflow (e.g. day 32 → next month). */
function formatDateParts(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day) // month is 0-indexed in Date constructor
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * When a recurring task is checked, create a new task with the next due date.
 * daily  → +1 day
 * weekly → +7 days
 * monthly → +1 month
 */
async function spawnNextRecurrence(taskId: string): Promise<void> {
  // Fetch the original task
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!task || !task.recurrence || task.recurrence === 'none') return

  // Compute next due date using pure string math to avoid timezone shifts
  let nextDate: string | null = null
  if (task.due_date) {
    const [y, m, d] = task.due_date.split('-').map(Number)
    if (task.recurrence === 'daily') {
      nextDate = formatDateParts(y, m, d + 1)
    } else if (task.recurrence === 'weekly') {
      nextDate = formatDateParts(y, m, d + 7)
    } else if (task.recurrence === 'monthly') {
      nextDate = formatDateParts(y, m + 1, d)
    }
  }

  // Create new task (same properties, reset status)
  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description,
      status: 'not_done',
      due_date: nextDate,
      timing: task.timing,
      tag: task.tag,
      recurrence: task.recurrence,
      created_by: task.created_by,
    })
    .select()
    .single()

  if (error || !newTask) {
    console.error('Error spawning recurrence:', error)
    return
  }

  // Copy assignees from original task
  const { data: assignees } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', taskId)

  if (assignees && assignees.length > 0) {
    await supabase.from('task_assignees').insert(
      assignees.map(a => ({ task_id: newTask.id, user_id: a.user_id }))
    )
  }

  // Copy checklist items (unchecked) from original task
  const { data: checklist } = await supabase
    .from('task_checklist_items')
    .select('text, sort_order')
    .eq('task_id', taskId)
    .order('sort_order', { ascending: true })

  if (checklist && checklist.length > 0) {
    await supabase.from('task_checklist_items').insert(
      checklist.map(c => ({ task_id: newTask.id, text: c.text, sort_order: c.sort_order }))
    )
  }
}

export async function updateTask(taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'due_date' | 'timing' | 'tag' | 'is_overdue' | 'recurrence'>>): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)

  if (error) {
    console.error('Error updating task:', error)
    return false
  }
  return true
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    console.error('Error deleting task:', error)
    return false
  }
  return true
}

// ============================================
// Task queries
// ============================================

export async function fetchTasksForUser(userId: string): Promise<TaskWithDetails[]> {
  const { data: assignees, error: aErr } = await supabase
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', userId)

  if (aErr || !assignees) return []

  const taskIds = assignees.map(a => a.task_id)
  if (taskIds.length === 0) return []

  return fetchTasksByIds(taskIds)
}

export async function fetchTasksByIds(taskIds: string[]): Promise<TaskWithDetails[]> {
  if (taskIds.length === 0) return []

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds)
    .order('created_at', { ascending: false })

  if (error || !tasks) return []

  const { data: allAssignees } = await supabase
    .from('task_assignees')
    .select('*, user:profiles(*)')
    .in('task_id', taskIds)

  const { data: allChecklists } = await supabase
    .from('task_checklist_items')
    .select('*')
    .in('task_id', taskIds)
    .order('sort_order', { ascending: true })

  const { data: allComments } = await supabase
    .from('task_comments')
    .select('*, user:profiles(*)')
    .in('task_id', taskIds)
    .order('created_at', { ascending: true })

  const todayStr = new Date().toISOString().split('T')[0]

  return (tasks as Task[]).map(task => ({
    ...task,
    recurrence: task.recurrence || 'none',
    // Compute overdue dynamically: past due_date + not checked (done but unchecked is still overdue)
    is_overdue: !!(task.due_date && task.due_date < todayStr && task.status !== 'checked'),
    assignees: (allAssignees || []).filter(a => a.task_id === task.id),
    checklist: (allChecklists || []).filter(c => c.task_id === task.id),
    comments: (allComments || []).filter(c => c.task_id === task.id),
  }))
}

export async function fetchTodayTasks(userId: string): Promise<{ today: TaskWithDetails[]; overdueOrUndated: TaskWithDetails[] }> {
  const allTasks = await fetchTasksForUser(userId)
  const todayStr = new Date().toISOString().split('T')[0]

  const today = allTasks.filter(t => t.due_date === todayStr)
  const overdueOrUndated = allTasks.filter(t => {
    if (!t.due_date) return true
    if (t.due_date < todayStr && t.status !== 'checked') return true
    return false
  })

  return { today, overdueOrUndated }
}

export async function fetchWeekTasks(userId: string, weekStart: Date): Promise<TaskWithDetails[]> {
  const allTasks = await fetchTasksForUser(userId)
  const startStr = weekStart.toISOString().split('T')[0]
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const endStr = end.toISOString().split('T')[0]

  return allTasks.filter(t => t.due_date && t.due_date >= startStr && t.due_date <= endStr)
}

export async function fetchFilteredTasks(userId: string, filter: TaskFilter): Promise<TaskWithDetails[]> {
  const allTasks = await fetchTasksForUser(userId)

  return allTasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false
    if (filter.is_overdue !== undefined && t.is_overdue !== filter.is_overdue) return false
    if (filter.due_date_from && (!t.due_date || t.due_date < filter.due_date_from)) return false
    if (filter.due_date_to && (!t.due_date || t.due_date > filter.due_date_to)) return false
    return true
  })
}

export async function fetchAnalyticsData(userId: string, period: 'week' | 'month' | 'year'): Promise<Record<TaskStatus, number>> {
  const allTasks = await fetchTasksForUser(userId)
  const now = new Date()
  let cutoff: Date

  if (period === 'week') {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else if (period === 'month') {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  } else {
    cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  }

  const cutoffStr = cutoff.toISOString().split('T')[0]
  const filtered = allTasks.filter(t => {
    if (t.due_date && t.due_date >= cutoffStr) return true
    if (!t.due_date && t.created_at >= cutoff.toISOString()) return true
    return false
  })

  const counts: Record<TaskStatus, number> = { not_done: 0, partial: 0, done: 0, checked: 0 }
  filtered.forEach(t => { counts[t.status]++ })
  return counts
}

// ============================================
// Checklist operations
// ============================================

export async function toggleChecklistItem(itemId: string, isCompleted: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('task_checklist_items')
    .update({ is_completed: isCompleted })
    .eq('id', itemId)
  return !error
}

export async function addChecklistItem(taskId: string, text: string, sortOrder: number): Promise<TaskChecklistItem | null> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({ task_id: taskId, text, sort_order: sortOrder })
    .select()
    .single()
  if (error) return null
  return data as TaskChecklistItem
}

// ============================================
// Comments
// ============================================

export async function addComment(taskId: string, userId: string, content: string): Promise<TaskComment | null> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, user_id: userId, content })
    .select('*, user:profiles(*)')
    .single()
  if (error) return null
  return data as TaskComment
}

// ============================================
// Team queries - FIXED hierarchy
// ============================================

/**
 * Fetch accessible team members based on role hierarchy:
 * - Teacher: no access to others
 * - Coordinator: only teachers in their own team
 * - Principal: all teachers + coordinators (all teams)
 * - Admin: all teachers + coordinators + principals (everyone)
 *
 * NEVER includes the current user (no duplicates)
 */
export async function fetchTeamMembers(userId: string, userRole: UserRole): Promise<UserProfile[]> {
  if (userRole === 'admin') {
    // Admin sees all: teachers, coordinators, principals
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['teacher', 'coordinator', 'principal'])
      .neq('id', userId) // exclude self
      .order('full_name')

    if (error) return []
    return (data || []) as UserProfile[]
  }

  if (userRole === 'principal') {
    // Principal sees all teachers and coordinators (NOT other principals, NOT admin)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['teacher', 'coordinator'])
      .neq('id', userId) // exclude self
      .order('full_name')

    if (error) return []
    return (data || []) as UserProfile[]
  }

  if (userRole === 'coordinator') {
    // Coordinator sees only teachers in their same team(s)
    const { data: myTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)

    if (!myTeams || myTeams.length === 0) return []

    const teamIds = myTeams.map(t => t.team_id)
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id, user:profiles(*)')
      .in('team_id', teamIds)

    if (!members) return []

    const uniqueUsers = new Map<string, UserProfile>()
    members.forEach(m => {
      const profile = m.user as unknown as UserProfile
      // Exclude self, only include teachers (not other coordinators)
      if (profile && m.user_id !== userId && profile.role === 'teacher') {
        uniqueUsers.set(m.user_id, profile)
      }
    })

    // Sort alphabetically
    return Array.from(uniqueUsers.values()).sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || '')
    )
  }

  return []
}

export async function fetchTeamAnalytics(userId: string, userRole: UserRole): Promise<{
  members: { user: UserProfile; stats: { completed: number; bonus: number; overdue: number; total: number; completionRate: number } }[]
}> {
  const teamMembers = await fetchTeamMembers(userId, userRole)

  // Include self for stats
  const { data: selfProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const allMembers = selfProfile ? [selfProfile as UserProfile, ...teamMembers] : teamMembers

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const memberStats = await Promise.all(
    allMembers.map(async (member) => {
      const tasks = await fetchTasksForUser(member.id)
      const monthTasks = tasks.filter(t => {
        if (t.due_date && t.due_date >= monthStart) return true
        if (!t.due_date && t.created_at >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString()) return true
        return false
      })

      const completed = monthTasks.filter(t => t.status === 'checked').length
      const bonus = monthTasks.filter(t => t.tag === 'bonus').length
      const overdue = monthTasks.filter(t => t.is_overdue).length
      const total = monthTasks.length

      return {
        user: member,
        stats: {
          completed,
          bonus,
          overdue,
          total,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      }
    })
  )

  return { members: memberStats }
}
