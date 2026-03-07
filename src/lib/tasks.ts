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
  timing: string | null       // legacy / start_time alias
  end_time: string | null     // new end-time field
  require_check: boolean      // false = not_done>partial>done(completed); true = not_done>partial>done(await)>checked(completed)
  tag: TaskTag
  bonus_points: number
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
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: 'image' | 'document' | 'link' | null
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
  creator?: UserProfile
}

export interface NewTaskInput {
  title: string
  description?: string
  due_date?: string
  timing?: string      // start time
  end_time?: string    // end time
  require_check?: boolean
  tag?: TaskTag
  bonus_points?: number
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

/**
 * Returns the display label for a status, taking require_check into account.
 * - require_check=false: done → "Completed" (final state for everyone)
 * - require_check=true:  done → "Awaiting Check", checked → "Completed"
 */
export function getDynamicStatusLabel(status: TaskStatus, requireCheck: boolean): string {
  if (!requireCheck) {
    if (status === 'done') return 'Completed'
    if (status === 'checked') return 'Completed'
  } else {
    if (status === 'done') return 'Done (awaiting check)'
    if (status === 'checked') return 'Completed'
  }
  return STATUS_LABELS[status]
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_done: 'bg-red-100 text-red-700 border-red-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  done: 'bg-green-100 text-green-700 border-green-200',
  checked: 'bg-blue-100 text-blue-700 border-blue-200',
}

/** Dynamic status colors: when require_check=true, done is orange (awaiting), checked is green */
export function getDynamicStatusColors(status: TaskStatus, requireCheck: boolean): string {
  if (requireCheck && status === 'done') return 'bg-orange-100 text-orange-700 border-orange-200'
  return STATUS_COLORS[status]
}

export const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  not_done: 'bg-red-500',
  partial: 'bg-amber-500',
  done: 'bg-green-500',
  checked: 'bg-blue-500',
}

export function getDynamicDotColor(status: TaskStatus, requireCheck: boolean): string {
  if (requireCheck && status === 'done') return 'bg-orange-500'
  return STATUS_DOT_COLORS[status]
}

export const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  none: 'No Repeat',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

/**
 * Returns the next status in the cycle.
 *
 * require_check = false (no verification needed):
 *   not_done → partial → done ("Completed") → not_done  (everyone cycles the same)
 *
 * require_check = true (verification required):
 *   Teacher (canCheck=false): not_done → partial → done ("Awaiting Check") → done (stuck)
 *   Coordinator+ (canCheck=true): not_done → partial → done → checked ("Completed") → not_done
 */
export function getNextStatus(current: TaskStatus, canCheck: boolean, requireCheck = true): TaskStatus {
  if (current === 'not_done') return 'partial'
  if (current === 'partial') return 'done'
  if (current === 'done') {
    if (requireCheck && canCheck) return 'checked'
    return 'not_done' // cycle back: completed (no check) or stuck then back (check required but can't check)
  }
  if (current === 'checked') return 'not_done'
  return current
}

// ============================================
// Task CRUD
// ============================================

export async function createTask(input: NewTaskInput, createdBy: string): Promise<Task | null> {
  const assigneeIds = input.assignee_ids.length > 0 ? input.assignee_ids : [createdBy]
  let firstTask: Task | null = null

  for (const assigneeId of assigneeIds) {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description || null,
        due_date: input.due_date || null,
        timing: input.timing || null,
        end_time: input.end_time || null,
        require_check: input.require_check ?? false,
        tag: input.tag || null,
        bonus_points: input.bonus_points || 0,
        recurrence: input.recurrence || 'none',
        created_by: createdBy,
      })
      .select()
      .single()

    if (error || !task) {
      console.error('Error creating task:', error)
      continue
    }

    await supabase.from('task_assignees').insert({ task_id: task.id, user_id: assigneeId })

    if (input.checklist_items && input.checklist_items.length > 0) {
      const checklistRecords = input.checklist_items.map((text, i) => ({
        task_id: task.id,
        text,
        sort_order: i,
      }))
      await supabase.from('task_checklist_items').insert(checklistRecords)
    }

    if (!firstTask) firstTask = task as Task
  }

  return firstTask
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

  if (status === 'checked') {
    await spawnNextRecurrence(taskId)
  }

  return true
}

/** Build a YYYY-MM-DD string from parts, letting Date handle overflow. */
function formatDateParts(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

async function spawnNextRecurrence(taskId: string): Promise<void> {
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!task || !task.recurrence || task.recurrence === 'none') return

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

  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description,
      status: 'not_done',
      due_date: nextDate,
      timing: task.timing,
      end_time: task.end_time || null,
      require_check: task.require_check ?? false,
      tag: task.tag,
      bonus_points: task.bonus_points || 0,
      recurrence: task.recurrence,
      created_by: task.created_by,
    })
    .select()
    .single()

  if (error || !newTask) {
    console.error('Error spawning recurrence:', error)
    return
  }

  const { data: assignees } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', taskId)

  if (assignees && assignees.length > 0) {
    await supabase.from('task_assignees').insert(
      assignees.map(a => ({ task_id: newTask.id, user_id: a.user_id }))
    )
  }

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

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'due_date' | 'timing' | 'end_time' | 'require_check' | 'tag' | 'bonus_points' | 'is_overdue' | 'recurrence'>>
): Promise<boolean> {
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

export async function updateTaskAssignees(taskId: string, assigneeIds: string[]): Promise<boolean> {
  // Delete existing assignees
  const { error: delErr } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)

  if (delErr) {
    console.error('Error deleting assignees:', delErr)
    return false
  }

  // Insert new assignees
  if (assigneeIds.length === 0) return true

  const { error: insErr } = await supabase
    .from('task_assignees')
    .insert(assigneeIds.map(uid => ({ task_id: taskId, user_id: uid })))

  if (insErr) {
    console.error('Error inserting assignees:', insErr)
    return false
  }

  return true
}

export async function updateChecklistItems(taskId: string, items: string[]): Promise<boolean> {
  // Delete existing items
  const { error: delErr } = await supabase
    .from('task_checklist_items')
    .delete()
    .eq('task_id', taskId)

  if (delErr) return false

  if (items.length === 0) return true

  const { error: insErr } = await supabase
    .from('task_checklist_items')
    .insert(items.map((text, i) => ({ task_id: taskId, text, sort_order: i })))

  return !insErr
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

  // Fetch creator profiles for permission checking
  const creatorIds = [...new Set((tasks as Task[]).map(t => t.created_by))]
  const { data: creatorProfiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', creatorIds)

  const creatorMap = new Map<string, UserProfile>()
  creatorProfiles?.forEach(p => creatorMap.set(p.id, p as UserProfile))

  const todayStr = new Date().toISOString().split('T')[0]

  return (tasks as Task[]).map(task => ({
    ...task,
    recurrence: task.recurrence || 'none',
    require_check: task.require_check ?? false,
    end_time: task.end_time || null,
    is_overdue: !!(task.due_date && task.due_date < todayStr && task.status !== 'checked'),
    assignees: (allAssignees || []).filter(a => a.task_id === task.id),
    checklist: (allChecklists || []).filter(c => c.task_id === task.id),
    comments: (allComments || []).filter(c => c.task_id === task.id),
    creator: creatorMap.get(task.created_by),
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
  // Use local date formatting to avoid UTC offset issues with toISOString()
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const startStr = fmt(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const endStr = fmt(end)

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

  const { data: subtasks } = await supabase
    .from('subtasks')
    .select('status, due_date, created_at')
    .eq('assignee_id', userId)

  const filteredSubtasks = (subtasks || []).filter((s: any) => {
    if (s.due_date && s.due_date >= cutoffStr) return true
    if (!s.due_date && s.created_at >= cutoff.toISOString()) return true
    return false
  })

  const counts: Record<TaskStatus, number> = { not_done: 0, partial: 0, done: 0, checked: 0 }
  filtered.forEach(t => { counts[t.status]++ })
  filteredSubtasks.forEach((s: any) => { counts[s.status as TaskStatus]++ })
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

export async function addComment(
  taskId: string,
  userId: string,
  content: string,
  attachment?: { url: string; name: string; type: 'image' | 'document' | 'link' }
): Promise<TaskComment | null> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      content,
      attachment_url: attachment?.url ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.type ?? null,
    })
    .select('*, user:profiles(*)')
    .single()
  if (error) return null
  return data as TaskComment
}

export async function uploadTaskAttachment(file: File, taskId: string, userId: string): Promise<{ url: string; name: string; type: 'image' | 'document' } | null> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${taskId}/${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('task-attachments').upload(path, file)
  if (error) return null
  const { data } = supabase.storage.from('task-attachments').getPublicUrl(path)
  const isImage = file.type.startsWith('image/')
  return { url: data.publicUrl, name: file.name, type: isImage ? 'image' : 'document' }
}

// ============================================
// Team queries - FIXED hierarchy
// ============================================

/**
 * Fetch accessible team members based on role hierarchy:
 * - Teacher: members of the same team(s) as the teacher (including coordinator)
 * - Coordinator: only teachers in their own team
 * - Principal: all teachers + coordinators (all teams)
 * - Admin: all teachers + coordinators + principals (everyone)
 *
 * NEVER includes the current user (no duplicates)
 */
export async function fetchTeamMembers(userId: string, userRole: UserRole): Promise<UserProfile[]> {
  if (userRole === 'admin') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['teacher', 'coordinator', 'principal'])
      .neq('id', userId)
      .order('full_name')

    if (error) return []
    return (data || []) as UserProfile[]
  }

  if (userRole === 'principal') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['teacher', 'coordinator'])
      .neq('id', userId)
      .order('full_name')

    if (error) return []
    return (data || []) as UserProfile[]
  }

  if (userRole === 'coordinator') {
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
      if (profile && m.user_id !== userId && profile.role === 'teacher') {
        uniqueUsers.set(m.user_id, profile)
      }
    })

    return Array.from(uniqueUsers.values()).sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || '')
    )
  }

  if (userRole === 'teacher') {
    // Teacher sees all members of their team(s), including coordinator
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
      if (profile && m.user_id !== userId) {
        uniqueUsers.set(m.user_id, profile)
      }
    })

    return Array.from(uniqueUsers.values()).sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || '')
    )
  }

  return []
}

export async function fetchTeamAnalytics(userId: string, userRole: UserRole): Promise<{
  members: { user: UserProfile; stats: { completed: number; bonus: number; overdue: number; total: number; completionRate: number } }[]
  teamCompletionRate: number
}> {
  const teamMembers = await fetchTeamMembers(userId, userRole)

  const { data: selfProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const allMembers = selfProfile ? [selfProfile as UserProfile, ...teamMembers] : teamMembers

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthStartISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStr = now.toISOString().split('T')[0]

  const memberStats = await Promise.all(
    allMembers.map(async (member) => {
      const tasks = await fetchTasksForUser(member.id)
      const monthTasks = tasks.filter(t => {
        if (t.due_date && t.due_date >= monthStart) return true
        if (!t.due_date && t.created_at >= monthStartISO) return true
        return false
      })

      const { data: subtasks } = await supabase
        .from('subtasks')
        .select('status, due_date, created_at, tag, bonus_points')
        .eq('assignee_id', member.id)

      const monthSubtasks = (subtasks || []).filter((s: any) => {
        if (s.due_date && s.due_date >= monthStart) return true
        if (!s.due_date && s.created_at >= monthStartISO) return true
        return false
      })

      const allItems = [
        ...monthTasks.map(t => ({ status: t.status, tag: t.tag, bonus_points: t.bonus_points || 0, is_overdue: t.is_overdue })),
        ...monthSubtasks.map((s: any) => ({
          status: s.status as TaskStatus,
          tag: s.tag,
          bonus_points: s.bonus_points || 0,
          is_overdue: !!(s.due_date && s.due_date < todayStr && s.status !== 'checked'),
        })),
      ]

      const completed = allItems.filter(t => t.status === 'checked').length
      const bonus = allItems
        .filter(t => t.status === 'checked')
        .reduce((sum, t) => sum + (t.bonus_points || 0), 0)
      const overdue = allItems.filter(t => t.is_overdue).length
      const total = allItems.length

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

  const teamTotal = memberStats.reduce((s, m) => s + m.stats.total, 0)
  const teamChecked = memberStats.reduce((s, m) => s + m.stats.completed, 0)
  const teamCompletionRate = teamTotal > 0 ? Math.round((teamChecked / teamTotal) * 100) : 0

  return { members: memberStats, teamCompletionRate }
}
