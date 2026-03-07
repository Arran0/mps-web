'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  FolderKanban,
  Calendar,
  Clock,
  Star,
  X,
  Edit3,
  Check,
  Circle,
  CircleDot,
  CheckCircle2,
  CheckSquare,
  Square,
  MessageSquare,
  Send,
  ShieldCheck,
  Repeat,
  Trash2,
} from 'lucide-react'
import NewTaskForm from './NewTaskForm'
import {
  fetchWeekTasks,
  fetchTodayTasks,
  TaskWithDetails,
  TaskStatus,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  RECURRENCE_LABELS,
  getDynamicStatusLabel,
  getDynamicStatusColors,
  getDynamicDotColor,
  getNextStatus,
  updateTaskStatus,
  updateTask,
  updateTaskAssignees,
  toggleChecklistItem,
  addChecklistItem,
  addComment,
  deleteTask,
  TaskRecurrence,
  TaskTag,
} from '@/lib/tasks'
import {
  fetchSubtasksForCalendar,
  SubtaskWithProject,
  updateSubtaskStatus,
  updateSubtask,
} from '@/lib/projects'
import { UserProfile } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/Avatar'

function canEditTaskFn(task: TaskWithDetails, userId: string, userRole: string): boolean {
  if (userRole === 'admin') return true
  const isAssignee = task.assignees.some(a => a.user_id === userId)
  const creatorRole = task.creator?.role
  if (userRole === 'principal') {
    if (isAssignee && creatorRole === 'admin') return false
    return true
  }
  if (userRole === 'coordinator') {
    if (isAssignee && (creatorRole === 'principal' || creatorRole === 'admin')) return false
    return true
  }
  if (userRole === 'teacher') {
    return task.created_by === userId
  }
  return false
}

interface WeeklyCalendarProps {
  userId: string
  profile: UserProfile
  canCheck: boolean
  canAssignToOthers: boolean
  availableAssignees: UserProfile[]
  viewingUserId?: string
  initialDate?: string
}


function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function getDayLabel(date: Date): { day: string; date: number; month: string; full: string } {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return {
    day: days[date.getDay()],
    date: date.getDate(),
    month: months[date.getMonth()],
    full: formatDate(date),
  }
}

// Chip border/bg colours mapped to task status (similar to SchoolWorkManager)
const CHIP_STYLE: Record<TaskStatus, string> = {
  not_done: 'border-slate-200 bg-white hover:border-slate-300',
  partial:  'border-amber-300 bg-amber-50 hover:border-amber-400',
  done:     'border-blue-200 bg-blue-50 hover:border-blue-300',
  checked:  'border-green-200 bg-green-50 hover:border-green-300',
}

export default function WeeklyCalendar({
  userId,
  profile,
  canCheck,
  canAssignToOthers,
  availableAssignees,
  viewingUserId,
  initialDate,
}: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState(() =>
    initialDate ? getWeekStart(new Date(initialDate)) : getWeekStart(new Date())
  )
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [subtasks, setSubtasks] = useState<SubtaskWithProject[]>([])
  const [overdueUndated, setOverdueUndated] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Modal state
  const [openTask, setOpenTask]       = useState<TaskWithDetails | null>(null)
  const [openSubtask, setOpenSubtask] = useState<SubtaskWithProject | null>(null)

  const { user } = useAuth()
  const targetUserId = viewingUserId || userId
  const todayStr = formatDate(new Date())
  // canEdit for subtasks uses simpler role-based check
  const canEditSubtasks = ['coordinator', 'principal', 'admin'].includes(profile.role)

  const initialLoadDone = useRef(false)

  const loadTasks = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true)
    const [weekData, todayData, subtaskData] = await Promise.all([
      fetchWeekTasks(targetUserId, weekStart),
      fetchTodayTasks(targetUserId),
      fetchSubtasksForCalendar(targetUserId),
    ])
    setTasks(weekData)
    setOverdueUndated(todayData.overdueOrUndated)
    setSubtasks(subtaskData)
    setLoading(false)
    initialLoadDone.current = true
  }, [targetUserId, weekStart])

  useEffect(() => {
    initialLoadDone.current = false
    loadTasks()
  }, [loadTasks])

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return getDayLabel(d)
  })

  const goToPrevWeek = () => {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 7)
    setWeekStart(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    setWeekStart(next)
  }

  const goToThisWeek = () => setWeekStart(getWeekStart(new Date()))

  const getTasksForDay    = (dateStr: string) => tasks.filter(t => t.due_date === dateStr)
  const getSubtasksForDay = (dateStr: string) => subtasks.filter(s => s.due_date === dateStr)

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    setOverdueUndated(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    // Sync open task if visible
    setOpenTask(prev => prev?.id === taskId ? { ...prev, status: newStatus } : prev)
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setOverdueUndated(prev => prev.filter(t => t.id !== taskId))
    setOpenTask(null)
  }

  const handleSubtaskStatusTap = async (subtask: SubtaskWithProject) => {
    const next = getNextStatus(subtask.status, canCheck, true)
    if (next === subtask.status) return
    const result = await updateSubtaskStatus(subtask.id, next, subtask.project_id, subtask.project_sequential)
    if (result.success) {
      setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, status: next } : s))
      setOpenSubtask(prev => prev?.id === subtask.id ? { ...prev, status: next } : prev)
    }
  }

  const weekLabel = `${weekDays[0].month} ${weekDays[0].date} – ${weekDays[6].month} ${weekDays[6].date}`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800">Weekly Calendar</h2>
        <button
          onClick={() => { setNewTaskDate(todayStr); setShowNewTask(true) }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevWeek}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>
        <button onClick={goToThisWeek} className="text-sm font-semibold text-slate-700 hover:text-cyan-600 transition-colors">
          {weekLabel}
        </button>
        <button
          onClick={goToNextWeek}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading calendar…</p>
        </div>
      ) : (
        <>
          {/* ── 7-Column Grid ─────────────────────────────────────────────────── */}
          <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
            <div className="flex min-w-[560px]">
              {weekDays.map((day, i) => {
                const dayTasks = getTasksForDay(day.full)
                const daySubs  = getSubtasksForDay(day.full)
                const isToday  = day.full === todayStr
                const isLast   = i === 6

                const isSelected = selectedDay === day.full

                return (
                  <div
                    key={day.full}
                    className={`flex-1 min-w-0 flex flex-col ${!isLast ? 'border-r border-slate-100' : ''}`}
                  >
                    {/* Day header — clickable */}
                    <button
                      onClick={() => setSelectedDay(isSelected ? null : day.full)}
                      className={`px-1.5 py-2 text-center border-b border-slate-100 w-full transition-colors ${
                        isSelected ? 'bg-mps-blue-100' : isToday ? 'bg-cyan-100' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                        isSelected ? 'text-mps-blue-600' : isToday ? 'text-cyan-600' : 'text-slate-400'
                      }`}>
                        {day.day}
                      </p>
                      <p className={`text-base font-bold leading-tight ${
                        isSelected ? 'text-mps-blue-700' : isToday ? 'text-cyan-700' : 'text-slate-700'
                      }`}>
                        {day.date}
                      </p>
                    </button>

                    {/* Tasks for this day */}
                    <div className={`p-1 space-y-1 flex-1 min-h-[96px] ${
                      isToday ? 'bg-cyan-50/40' : 'bg-white'
                    }`}>
                      {dayTasks.map(task => (
                        <TaskGridChip
                          key={task.id}
                          task={task}
                          canCheck={canCheck}
                          onStatusChange={handleTaskStatusChange}
                          onOpen={() => setOpenTask(task)}
                        />
                      ))}
                      {daySubs.map(sub => (
                        <SubtaskGridChip
                          key={sub.id}
                          subtask={sub}
                          canCheck={canCheck}
                          onStatusTap={handleSubtaskStatusTap}
                          onOpen={() => setOpenSubtask(sub)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Selected Day Panel ───────────────────────────────────────────── */}
          <AnimatePresence>
            {selectedDay && (() => {
              const dayLabel = weekDays.find(d => d.full === selectedDay)
              const dayTasks = getTasksForDay(selectedDay)
              const daySubs  = getSubtasksForDay(selectedDay)
              const total    = dayTasks.length + daySubs.length
              return (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl border border-mps-blue-100 bg-mps-blue-50/40 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-mps-blue-700 uppercase tracking-wide">
                      {dayLabel?.day} {dayLabel?.date} · {total} item{total !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => { setNewTaskDate(selectedDay); setShowNewTask(true) }}
                      className="text-xs text-mps-blue-600 hover:text-mps-blue-800 font-medium flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Task
                    </button>
                  </div>
                  {total === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No tasks for this day</p>
                  ) : (
                    <div className="space-y-1">
                      {dayTasks.map(task => (
                        <TaskGridChip
                          key={task.id}
                          task={task}
                          canCheck={canCheck}
                          onStatusChange={handleTaskStatusChange}
                          onOpen={() => setOpenTask(task)}
                        />
                      ))}
                      {daySubs.map(sub => (
                        <SubtaskGridChip
                          key={sub.id}
                          subtask={sub}
                          canCheck={canCheck}
                          onStatusTap={handleSubtaskStatusTap}
                          onOpen={() => setOpenSubtask(sub)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })()}
          </AnimatePresence>

          {/* ── Overdue & Undated ─────────────────────────────────────────────── */}
          {overdueUndated.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-red-500" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Overdue &amp; Undated
                  <span className="ml-1.5 text-xs font-normal text-red-400">({overdueUndated.length})</span>
                </h3>
              </div>
              <div className="space-y-1.5">
                {overdueUndated.map(task => (
                  <TaskGridChip
                    key={task.id}
                    task={task}
                    canCheck={canCheck}
                    onStatusChange={handleTaskStatusChange}
                    onOpen={() => setOpenTask(task)}
                    showDate
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Task Detail Modal ────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {openTask && (
            <TaskCalendarModal
              task={openTask}
              canCheck={canCheck}
              userId={user?.id || userId}
              userRole={profile.role}
              onClose={() => setOpenTask(null)}
              onStatusChange={handleTaskStatusChange}
              onTaskDeleted={handleTaskDeleted}
              onTaskUpdated={loadTasks}
              availableAssignees={availableAssignees}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Subtask Detail Modal ─────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {openSubtask && (
            <SubtaskDetailModal
              subtask={openSubtask}
              canCheck={canCheck}
              canEdit={canEditSubtasks}
              onClose={() => setOpenSubtask(null)}
              onStatusTap={handleSubtaskStatusTap}
              onSubtaskUpdated={loadTasks}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      <NewTaskForm
        isOpen={showNewTask}
        onClose={() => setShowNewTask(false)}
        onTaskCreated={loadTasks}
        currentUserId={userId}
        defaultAssigneeId={targetUserId}
        defaultDate={newTaskDate}
        availableAssignees={availableAssignees}
        canAssignToOthers={canAssignToOthers}
      />
    </div>
  )
}

// Status icons matching SchoolWorkManager style
const TASK_STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  not_done: <Circle       size={14} className="text-red-400" />,
  partial:  <CircleDot    size={14} className="text-amber-500" />,
  done:     <CheckCircle2 size={14} className="text-blue-500" />,
  checked:  <CheckCircle2 size={14} className="text-green-500" />,
}

// ─── Task Grid Chip ────────────────────────────────────────────────────────────

function TaskGridChip({
  task,
  canCheck,
  onStatusChange,
  onOpen,
  showDate,
}: {
  task: TaskWithDetails
  canCheck: boolean
  onStatusChange: (id: string, status: TaskStatus) => void
  onOpen: () => void
  showDate?: boolean
}) {
  const handleIconClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = getNextStatus(task.status, canCheck, task.require_check ?? true)
    if (next === task.status) return
    const ok = await updateTaskStatus(task.id, next)
    if (ok) onStatusChange(task.id, next)
  }

  const hasComments = task.comments.length > 0

  return (
    <div
      className={`w-full text-[11px] p-1.5 rounded-lg border transition-all relative ${CHIP_STYLE[task.status]} ${hasComments ? 'border-l-[3px] border-l-blue-400' : ''}`}
    >
      <div className="flex items-start gap-1">
        <button
          onClick={handleIconClick}
          className="flex-shrink-0 mt-0.5 hover:scale-125 transition-transform"
          title="Tap to cycle status"
        >
          {TASK_STATUS_ICON[task.status]}
        </button>
        <button
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
          title="Tap to see details"
        >
          <p className={`font-medium leading-tight truncate ${
            task.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-700'
          }`}>
            {task.title}
          </p>
          {(showDate && task.due_date) && (
            <p className="text-[9px] text-red-400 font-medium">{task.due_date}</p>
          )}
        </button>
      </div>
      {/* Comment count badge — top-right corner */}
      {hasComments && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-blue-500 text-white rounded-full px-1 min-w-[14px] h-[14px] justify-center shadow-sm">
          <span className="text-[9px] font-bold leading-none">{task.comments.length}</span>
        </span>
      )}
    </div>
  )
}

// ─── Subtask Grid Chip ────────────────────────────────────────────────────────

function SubtaskGridChip({
  subtask,
  onStatusTap,
  onOpen,
}: {
  subtask: SubtaskWithProject
  canCheck?: boolean
  onStatusTap: (s: SubtaskWithProject) => void
  onOpen: () => void
}) {
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onStatusTap(subtask)
  }

  return (
    <div
      className={`w-full text-[11px] p-1.5 rounded-lg border transition-all ${CHIP_STYLE[subtask.status]}`}
    >
      <div className="flex items-start gap-1">
        <button
          onClick={handleIconClick}
          className="flex-shrink-0 mt-0.5 hover:scale-125 transition-transform"
          title="Tap to cycle status"
        >
          {TASK_STATUS_ICON[subtask.status]}
        </button>
        <button
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
          title="Tap to see details"
        >
          <p className={`font-medium leading-tight truncate ${
            subtask.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-700'
          }`}>
            {subtask.title}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="inline-block px-1 rounded text-[9px] font-bold leading-tight bg-purple-100 text-purple-600">
              P
            </span>
            <span className="text-slate-400 truncate text-[10px]">
              {subtask.project_title}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Task Calendar Modal ──────────────────────────────────────────────────────

function TaskCalendarModal({
  task,
  canCheck,
  userId,
  userRole,
  onClose,
  onStatusChange,
  onTaskDeleted,
  onTaskUpdated,
  availableAssignees = [],
}: {
  task: TaskWithDetails
  canCheck: boolean
  userId: string
  userRole: string
  onClose: () => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onTaskDeleted: (id: string) => void
  onTaskUpdated: () => void
  availableAssignees?: UserProfile[]
}) {
  const requireCheck = task.require_check ?? false
  const canEdit = canEditTaskFn(task, userId, userRole)

  const [editing, setEditing]             = useState(false)
  const [editTitle, setEditTitle]         = useState(task.title)
  const [editDesc, setEditDesc]           = useState(task.description || '')
  const [editDate, setEditDate]           = useState(task.due_date || '')
  const [editStartTime, setEditStartTime] = useState(task.timing || '')
  const [editEndTime, setEditEndTime]     = useState(task.end_time || '')
  const [editRequireCheck, setEditRequireCheck] = useState(requireCheck)
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>(task.recurrence || 'none')
  const [editBonusPoints, setEditBonusPoints] = useState(task.bonus_points || 0)
  const [editTag, setEditTag]             = useState<TaskTag>(task.tag)
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>(task.assignees.map(a => a.user_id))
  const [editChecklistItems, setEditChecklistItems] = useState<string[]>(task.checklist.map(c => c.text))
  const [newEditCheckItem, setNewEditCheckItem] = useState('')
  const [saving, setSaving]               = useState(false)

  // Live checklist / comments interaction
  const [newCheckItem, setNewCheckItem]   = useState('')
  const [newComment, setNewComment]       = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [localChecklist, setLocalChecklist] = useState(task.checklist)
  const [localComments, setLocalComments]   = useState(task.comments)

  const canEditAssignees = ['coordinator', 'principal', 'admin'].includes(userRole)

  const handleStatusClick = async () => {
    const next = getNextStatus(task.status, canCheck, requireCheck)
    if (next === task.status) return
    const ok = await updateTaskStatus(task.id, next)
    if (ok) onStatusChange(task.id, next)
  }

  const handleToggleChecklist = async (itemId: string, current: boolean) => {
    await toggleChecklistItem(itemId, !current)
    setLocalChecklist(prev => prev.map(c => c.id === itemId ? { ...c, is_completed: !current } : c))
    onTaskUpdated()
  }

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return
    const item = await addChecklistItem(task.id, newCheckItem.trim(), localChecklist.length)
    if (item) {
      setLocalChecklist(prev => [...prev, item])
      setNewCheckItem('')
      onTaskUpdated()
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setSubmitting(true)
    const comment = await addComment(task.id, userId, newComment.trim())
    if (comment) {
      setLocalComments(prev => [...prev, comment])
      setNewComment('')
      onTaskUpdated()
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    const ok = await deleteTask(task.id)
    if (ok) {
      onClose()
      onTaskDeleted(task.id)
    }
  }

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    const ok = await updateTask(task.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      due_date: editDate || null,
      timing: editStartTime || null,
      end_time: editEndTime || null,
      require_check: editRequireCheck,
      recurrence: editRecurrence,
      bonus_points: editBonusPoints,
      tag: editTag,
    })

    if (canEditAssignees) {
      const origIds = task.assignees.map(a => a.user_id).sort()
      const newIds = [...editAssigneeIds].sort()
      if (JSON.stringify(origIds) !== JSON.stringify(newIds)) {
        await updateTaskAssignees(task.id, editAssigneeIds)
      }
    }

    setSaving(false)
    if (ok) {
      setEditing(false)
      onTaskUpdated()
    }
  }

  const statusLabel = getDynamicStatusLabel(task.status, requireCheck)
  const statusColorClass = getDynamicStatusColors(task.status, requireCheck)
  const dotColorClass = getDynamicDotColor(task.status, requireCheck)

  const completedChecklist = localChecklist.filter(c => c.is_completed).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleStatusClick}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 hover:shadow-lg ${statusColorClass}`}
              title="Tap to change status"
            >
              <div className={`w-3.5 h-3.5 rounded-full ${dotColorClass} animate-pulse`} />
              {statusLabel}
              <ChevronRight size={14} className="opacity-50" />
            </button>
            {task.bonus_points > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                {task.bonus_points} BP
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-2 text-mps-blue-500 hover:text-mps-blue-700 hover:bg-mps-blue-50 rounded-lg transition-colors"
                title="Edit task"
              >
                <Edit3 size={16} />
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete task"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {editing ? (
            <div className="space-y-3 border border-mps-blue-200 rounded-2xl p-4 bg-mps-blue-50/30">
              <h4 className="text-sm font-semibold text-mps-blue-700 flex items-center gap-1.5">
                <Edit3 size={14} /> Edit Task
              </h4>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Title *"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 resize-none bg-white"
              />
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Start Time</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={e => setEditStartTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">End Time</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={e => setEditEndTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Recurrence</label>
                  <select
                    value={editRecurrence}
                    onChange={e => setEditRecurrence(e.target.value as TaskRecurrence)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  >
                    {(Object.keys(RECURRENCE_LABELS) as TaskRecurrence[]).map(r => (
                      <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Bonus Points</label>
                  <select
                    value={editBonusPoints}
                    onChange={e => setEditBonusPoints(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  >
                    <option value="0">None</option>
                    <option value="1">1 Point</option>
                    <option value="2">2 Points</option>
                    <option value="3">3 Points</option>
                    <option value="4">4 Points</option>
                    <option value="5">5 Points</option>
                  </select>
                </div>
              </div>
              {/* Require Check */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className={editRequireCheck ? 'text-mps-blue-600' : 'text-slate-400'} />
                  <p className="text-xs font-medium text-slate-700">Require Verification</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditRequireCheck(prev => !prev)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editRequireCheck ? 'bg-mps-blue-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${editRequireCheck ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {/* Assignees edit */}
              {canEditAssignees && availableAssignees.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Assignees</label>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-1.5 space-y-0.5 bg-white">
                    {availableAssignees.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setEditAssigneeIds(prev =>
                          prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        )}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          editAssigneeIds.includes(u.id)
                            ? 'bg-mps-blue-50 text-mps-blue-700 border border-mps-blue-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${editAssigneeIds.includes(u.id) ? 'bg-mps-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        <span>{u.full_name}</span>
                        <span className="text-slate-400 ml-auto">{u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Checklist edit */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Checklist Items</label>
                <div className="space-y-1 mb-1.5">
                  {editChecklistItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs text-slate-700 flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => setEditChecklistItems(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newEditCheckItem}
                    onChange={e => setNewEditCheckItem(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newEditCheckItem.trim()) {
                          setEditChecklistItems(prev => [...prev, newEditCheckItem.trim()])
                          setNewEditCheckItem('')
                        }
                      }
                    }}
                    placeholder="Add item..."
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-mps-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEditCheckItem.trim()) {
                        setEditChecklistItems(prev => [...prev, newEditCheckItem.trim()])
                        setNewEditCheckItem('')
                      }
                    }}
                    className="p-1.5 text-mps-blue-600 hover:bg-mps-blue-50 rounded-lg"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{task.title}</h2>
                {task.description && (
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">{task.description}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {task.due_date && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <Calendar size={14} /> {task.due_date}
                  </div>
                )}
                {task.timing && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <Clock size={14} /> {task.timing}{task.end_time ? ` – ${task.end_time}` : ''}
                  </div>
                )}
                {task.bonus_points > 0 && (
                  <div className="flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                    <Star size={14} /> {task.bonus_points} BP
                  </div>
                )}
                {task.recurrence && task.recurrence !== 'none' && (
                  <div className="flex items-center gap-1.5 text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg">
                    <Repeat size={14} /> {RECURRENCE_LABELS[task.recurrence]}
                  </div>
                )}
                {requireCheck && (
                  <div className="flex items-center gap-1.5 text-sm text-mps-blue-600 bg-mps-blue-50 px-3 py-1.5 rounded-lg font-medium">
                    <ShieldCheck size={14} /> Verification Required
                  </div>
                )}
              </div>

              {task.assignees && task.assignees.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1.5">Assignees</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.assignees.map(a => (
                      <span key={a.id} className="text-xs bg-mps-blue-50 text-mps-blue-700 px-2.5 py-1 rounded-full font-medium">
                        {a.user?.full_name ?? a.user_id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Checklist (always shown in view mode) */}
          {!editing && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <CheckSquare size={14} />
                Checklist
                {localChecklist.length > 0 && (
                  <span className="text-xs font-normal text-slate-500">({completedChecklist}/{localChecklist.length})</span>
                )}
              </h4>
              <div className="space-y-1.5">
                {localChecklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id, item.is_completed)}
                    className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {item.is_completed ? (
                      <CheckSquare size={16} className="text-mps-green-600 flex-shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
                {localChecklist.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No checklist items yet</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCheckItem()}
                  placeholder="Add checklist item..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
                />
                <button onClick={handleAddCheckItem} className="text-mps-blue-600 hover:text-mps-blue-700 p-1.5">
                  <CheckSquare size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Comments (always shown in view mode) */}
          {!editing && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <MessageSquare size={14} />
                Comments ({localComments.length})
              </h4>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {localComments.map(comment => (
                  <div key={comment.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar avatarUrl={comment.user?.avatar_url} name={comment.user?.full_name} size={22} />
                      <span className="text-xs font-medium text-slate-700">{comment.user?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 pl-8">{comment.content}</p>
                  </div>
                ))}
                {localComments.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">No comments yet</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !submitting && handleAddComment()}
                  placeholder="Write a comment..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                  className="p-2 bg-mps-blue-500 text-white rounded-lg hover:bg-mps-blue-600 disabled:opacity-50 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Subtask Detail Modal ─────────────────────────────────────────────────────

function SubtaskDetailModal({
  subtask,
  canCheck,
  canEdit,
  onClose,
  onStatusTap,
  onSubtaskUpdated,
}: {
  subtask: SubtaskWithProject
  canCheck: boolean
  canEdit: boolean
  onClose: () => void
  onStatusTap: (s: SubtaskWithProject) => void
  onSubtaskUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(subtask.title)
  const [editDesc, setEditDesc] = useState(subtask.description || '')
  const [editDueDate, setEditDueDate] = useState(subtask.due_date || '')
  const [editTiming, setEditTiming] = useState(subtask.timing || '')
  const [editBonusPoints, setEditBonusPoints] = useState<number>(subtask.bonus_points || 0)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    const ok = await updateSubtask(subtask.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      due_date: editDueDate || null,
      timing: editTiming || null,
      bonus_points: editBonusPoints,
      tag: editBonusPoints > 0 ? 'bonus' : null,
    })
    setSaving(false)
    if (ok) {
      setEditing(false)
      onSubtaskUpdated()
    }
  }

  const handleStartEdit = () => {
    setEditTitle(subtask.title)
    setEditDesc(subtask.description || '')
    setEditDueDate(subtask.due_date || '')
    setEditTiming(subtask.timing || '')
    setEditBonusPoints(subtask.bonus_points || 0)
    setEditing(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onStatusTap(subtask)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 hover:shadow-lg ${STATUS_COLORS[subtask.status]}`}
              title="Tap to change status"
            >
              <div className={`w-3.5 h-3.5 rounded-full ${STATUS_DOT_COLORS[subtask.status]} animate-pulse`} />
              {STATUS_LABELS[subtask.status]}
              <ChevronRight size={14} className="opacity-50" />
            </button>
            {(subtask.bonus_points > 0 || subtask.tag === 'bonus') && !editing && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                {subtask.bonus_points > 0 ? `${subtask.bonus_points} BP` : 'Bonus'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={handleStartEdit}
                className="p-2 text-mps-blue-500 hover:text-mps-blue-700 hover:bg-mps-blue-50 rounded-lg transition-colors"
              >
                <Edit3 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {editing ? (
            <div className="space-y-3 border border-mps-blue-200 rounded-2xl p-4 bg-mps-blue-50/30">
              <h4 className="text-sm font-semibold text-mps-blue-700 flex items-center gap-1.5">
                <Edit3 size={14} /> Edit Subtask
              </h4>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Title *"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 resize-none bg-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Timing</label>
                  <input
                    type="time"
                    value={editTiming}
                    onChange={e => setEditTiming(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Bonus Points</label>
                <select
                  value={editBonusPoints}
                  onChange={e => setEditBonusPoints(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                >
                  <option value={0}>None</option>
                  {[1,2,3,4,5].map(n => (
                    <option key={n} value={n}>{n} BP</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{subtask.title}</h2>
                {subtask.description && (
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">{subtask.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium flex items-center gap-1">
                  <FolderKanban size={12} />
                  {subtask.project_title}
                </span>
                {subtask.project_sequential && (
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
                    Sequential
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {subtask.due_date && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <Calendar size={14} />
                    <span>{subtask.due_date}</span>
                  </div>
                )}
                {subtask.timing && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <Clock size={14} />
                    <span>{subtask.timing}</span>
                  </div>
                )}
              </div>

              {subtask.assignee && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Assignee</h4>
                  <span className="text-xs bg-mps-blue-50 text-mps-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {subtask.assignee.full_name}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
