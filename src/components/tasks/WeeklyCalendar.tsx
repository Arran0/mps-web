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
  getNextStatus,
  updateTaskStatus,
  updateTask,
} from '@/lib/tasks'
import {
  fetchSubtasksForCalendar,
  SubtaskWithProject,
  updateSubtaskStatus,
  updateSubtask,
} from '@/lib/projects'
import { UserProfile } from '@/lib/supabase'

interface WeeklyCalendarProps {
  userId: string
  profile: UserProfile
  canCheck: boolean
  canAssignToOthers: boolean
  availableAssignees: UserProfile[]
  viewingUserId?: string
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
}: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [subtasks, setSubtasks] = useState<SubtaskWithProject[]>([])
  const [overdueUndated, setOverdueUndated] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')

  // Modal state
  const [openTask, setOpenTask]       = useState<TaskWithDetails | null>(null)
  const [openSubtask, setOpenSubtask] = useState<SubtaskWithProject | null>(null)

  const targetUserId = viewingUserId || userId
  const todayStr = formatDate(new Date())
  const canEdit = ['coordinator', 'principal', 'admin'].includes(profile.role)

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
    const next = getNextStatus(subtask.status, canCheck)
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
      <div className="flex items-center justify-between glass rounded-xl p-3">
        <button onClick={goToPrevWeek} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-800 text-sm">{weekLabel}</p>
          <button onClick={goToThisWeek} className="text-xs text-mps-blue-600 hover:text-mps-blue-700 font-medium">
            Today
          </button>
        </div>
        <button onClick={goToNextWeek} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
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
          <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm -mx-1 px-1">
            <div className="flex min-w-[560px]">
              {weekDays.map((day, i) => {
                const dayTasks = getTasksForDay(day.full)
                const daySubs  = getSubtasksForDay(day.full)
                const isToday  = day.full === todayStr
                const isLast   = i === 6

                return (
                  <div
                    key={day.full}
                    className={`flex-1 min-w-0 flex flex-col ${!isLast ? 'border-r border-slate-100' : ''}`}
                  >
                    {/* Day header */}
                    <div className={`px-1.5 py-2 text-center border-b border-slate-100 flex items-center justify-between ${
                      isToday ? 'bg-cyan-50' : 'bg-slate-50'
                    }`}>
                      <div className="flex-1 text-center">
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                          isToday ? 'text-cyan-600' : 'text-slate-400'
                        }`}>
                          {day.day}
                        </p>
                        <p className={`text-sm font-bold leading-tight ${
                          isToday ? 'text-cyan-700' : 'text-slate-700'
                        }`}>
                          {day.date}
                        </p>
                      </div>
                      <button
                        onClick={() => { setNewTaskDate(day.full); setShowNewTask(true) }}
                        className={`flex-shrink-0 p-0.5 rounded transition-colors ${
                          isToday ? 'text-cyan-500 hover:bg-cyan-100' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={`Add task for ${day.day} ${day.date}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Tasks for this day */}
                    <div className={`p-1 space-y-1 flex-1 min-h-[80px] max-h-[240px] overflow-y-auto ${
                      isToday ? 'bg-cyan-50/30' : ''
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
                      {dayTasks.length === 0 && daySubs.length === 0 && (
                        <p className="text-[10px] text-slate-300 text-center py-3">–</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Overdue & Undated ─────────────────────────────────────────────── */}
          {overdueUndated.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle size={14} className="text-amber-500" />
                Overdue &amp; Undated
                <span className="text-xs font-normal text-slate-400">({overdueUndated.length})</span>
              </h3>
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
            </motion.div>
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
              canEdit={canEdit}
              onClose={() => setOpenTask(null)}
              onStatusChange={handleTaskStatusChange}
              onTaskDeleted={handleTaskDeleted}
              onTaskUpdated={loadTasks}
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
              canEdit={canEdit}
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
  const handleDotClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = getNextStatus(task.status, canCheck)
    if (next === task.status) return
    const ok = await updateTaskStatus(task.id, next)
    if (ok) onStatusChange(task.id, next)
  }

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left text-[11px] px-1.5 py-1.5 rounded-lg border transition-all active:scale-95 ${CHIP_STYLE[task.status]}`}
    >
      <div className="flex items-start gap-1">
        <div
          onClick={handleDotClick}
          className={`flex-shrink-0 mt-[2px] w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[task.status]} cursor-pointer hover:scale-125 transition-transform`}
          title={`${STATUS_LABELS[task.status]} → tap to change`}
        />
        <div className="min-w-0 flex-1">
          <p className={`font-medium leading-tight truncate ${
            task.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-700'
          }`}>
            {task.title}
          </p>
          {(showDate && task.due_date) && (
            <p className="text-[9px] text-red-400 font-medium">{task.due_date}</p>
          )}
          {task.timing && !showDate && (
            <p className="text-[9px] text-slate-400">{task.timing}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Subtask Grid Chip ────────────────────────────────────────────────────────

function SubtaskGridChip({
  subtask,
  canCheck,
  onStatusTap,
  onOpen,
}: {
  subtask: SubtaskWithProject
  canCheck: boolean
  onStatusTap: (s: SubtaskWithProject) => void
  onOpen: () => void
}) {
  const handleDotClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onStatusTap(subtask)
  }

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left text-[11px] px-1.5 py-1.5 rounded-lg border transition-all active:scale-95 ${CHIP_STYLE[subtask.status]}`}
    >
      <div className="flex items-start gap-1">
        <div
          onClick={handleDotClick}
          className={`flex-shrink-0 mt-[2px] w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[subtask.status]} cursor-pointer hover:scale-125 transition-transform`}
          title={`${STATUS_LABELS[subtask.status]} → tap to change`}
        />
        <div className="min-w-0 flex-1">
          <p className={`font-medium leading-tight truncate ${
            subtask.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-700'
          }`}>
            {subtask.title}
          </p>
          <p className="text-[9px] text-purple-400 truncate flex items-center gap-0.5">
            <FolderKanban size={7} className="inline flex-shrink-0" />
            {subtask.project_title}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── Task Calendar Modal ──────────────────────────────────────────────────────

function TaskCalendarModal({
  task,
  canCheck,
  canEdit,
  onClose,
  onStatusChange,
  onTaskDeleted,
  onTaskUpdated,
}: {
  task: TaskWithDetails
  canCheck: boolean
  canEdit: boolean
  onClose: () => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onTaskDeleted: (id: string) => void
  onTaskUpdated: () => void
}) {
  const [editing, setEditing]       = useState(false)
  const [editTitle, setEditTitle]   = useState(task.title)
  const [editDesc, setEditDesc]     = useState(task.description || '')
  const [editDate, setEditDate]     = useState(task.due_date || '')
  const [editTiming, setEditTiming] = useState(task.timing || '')
  const [saving, setSaving]         = useState(false)

  const handleStatusClick = async () => {
    const next = getNextStatus(task.status, canCheck)
    if (next === task.status) return
    const ok = await updateTaskStatus(task.id, next)
    if (ok) onStatusChange(task.id, next)
  }

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    const ok = await updateTask(task.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      due_date: editDate || undefined,
      timing: editTiming || undefined,
    })
    setSaving(false)
    if (ok) {
      setEditing(false)
      onTaskUpdated()
    }
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
          <button
            onClick={handleStatusClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 hover:shadow-lg ${STATUS_COLORS[task.status]}`}
            title="Tap to change status"
          >
            <div className={`w-3.5 h-3.5 rounded-full ${STATUS_DOT_COLORS[task.status]} animate-pulse`} />
            {STATUS_LABELS[task.status]}
            <ChevronRight size={14} className="opacity-50" />
          </button>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
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
                    <Clock size={14} /> {task.timing}
                  </div>
                )}
                {task.bonus_points > 0 && (
                  <div className="flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                    <Star size={14} /> {task.bonus_points} BP
                  </div>
                )}
              </div>

              {task.assignee && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1.5">Assignee</h4>
                  <span className="text-xs bg-mps-blue-50 text-mps-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {task.assignee.full_name}
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
