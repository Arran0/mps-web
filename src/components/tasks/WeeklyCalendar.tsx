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
import TaskCard from './TaskCard'
import NewTaskForm from './NewTaskForm'
import {
  fetchWeekTasks,
  fetchTodayTasks,
  TaskWithDetails,
  TaskStatus,
  TaskTag,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  getNextStatus,
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

function getDayLabel(date: Date): { day: string; date: number; month: string; full: string; longDay: string } {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return {
    day: days[date.getDay()],
    longDay: longDays[date.getDay()],
    date: date.getDate(),
    month: months[date.getMonth()],
    full: formatDate(date),
  }
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
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()))

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

  const goToThisWeek = () => {
    setWeekStart(getWeekStart(new Date()))
    setSelectedDate(todayStr)
  }

  const getTasksForDay = (dateStr: string) => tasks.filter(t => t.due_date === dateStr)
  const getSubtasksForDay = (dateStr: string) => subtasks.filter(s => s.due_date === dateStr)

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    setOverdueUndated(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setOverdueUndated(prev => prev.filter(t => t.id !== taskId))
  }

  const handleSubtaskStatusTap = async (subtask: SubtaskWithProject) => {
    const next = getNextStatus(subtask.status, canCheck)
    if (next === subtask.status) return
    const result = await updateSubtaskStatus(subtask.id, next, subtask.project_id, subtask.project_sequential)
    if (result.success) {
      setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, status: next } : s))
    }
  }

  const weekLabel = `${weekDays[0].month} ${weekDays[0].date} – ${weekDays[6].month} ${weekDays[6].date}`

  // Get tasks/subtasks for the selected date
  const selectedDayTasks = getTasksForDay(selectedDate)
  const selectedDaySubtasks = getSubtasksForDay(selectedDate)
  const selectedDayInfo = weekDays.find(d => d.full === selectedDate) || getDayLabel(new Date())

  // Count all items for selected day
  const allSelectedItems = [...selectedDayTasks, ...selectedDaySubtasks]
  const selectedCounts = {
    not_done: allSelectedItems.filter(t => t.status === 'not_done').length,
    partial: allSelectedItems.filter(t => t.status === 'partial').length,
    done: allSelectedItems.filter(t => t.status === 'done').length,
    checked: allSelectedItems.filter(t => t.status === 'checked').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800">Weekly Calendar</h2>
        <button
          onClick={() => { setNewTaskDate(selectedDate); setShowNewTask(true) }}
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
          <p className="font-semibold text-slate-800">{weekLabel}</p>
          <button onClick={goToThisWeek} className="text-xs text-mps-blue-600 hover:text-mps-blue-700 font-medium">
            Today
          </button>
        </div>
        <button onClick={goToNextWeek} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day Selector Row */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day) => {
          const dayTasks = getTasksForDay(day.full)
          const daySubs = getSubtasksForDay(day.full)
          const allDayItems = [...dayTasks, ...daySubs]
          const isToday = day.full === todayStr
          const isSelected = day.full === selectedDate

          return (
            <button
              key={day.full}
              onClick={() => setSelectedDate(day.full)}
              className={`rounded-xl p-2 text-center transition-all border-2 ${
                isSelected
                  ? 'border-mps-blue-400 bg-mps-blue-50 shadow-md'
                  : isToday
                    ? 'border-mps-green-300 bg-mps-green-50/50'
                    : 'border-transparent glass hover:border-slate-200'
              }`}
            >
              <p className={`text-[10px] font-medium ${
                isSelected ? 'text-mps-blue-700' : isToday ? 'text-mps-green-700' : 'text-slate-500'
              }`}>
                {day.day}
              </p>
              <p className={`text-base font-bold ${
                isSelected ? 'text-mps-blue-700' : isToday ? 'text-mps-green-700' : 'text-slate-800'
              }`}>
                {day.date}
              </p>
              {allDayItems.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-1">
                  {allDayItems.slice(0, 4).map((t, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[t.status]}`} />
                  ))}
                  {allDayItems.length > 4 && (
                    <span className="text-[7px] text-slate-400">+{allDayItems.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading calendar...</p>
        </div>
      ) : (
        <>
          {/* Selected Day Status Summary */}
          {allSelectedItems.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: 'not_done' as const, label: 'Not Done', color: 'text-red-600', dot: 'bg-red-500' },
                { key: 'partial' as const, label: 'Partial', color: 'text-amber-600', dot: 'bg-amber-500' },
                { key: 'done' as const, label: 'Done', color: 'text-green-600', dot: 'bg-green-500' },
                { key: 'checked' as const, label: 'Checked', color: 'text-blue-600', dot: 'bg-blue-500' },
              ]).map(s => (
                <div key={s.key} className="glass rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className={`text-lg font-bold ${s.color}`}>{selectedCounts[s.key]}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Selected Day Task List */}
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700">
                {selectedDate === todayStr ? 'Today' : selectedDayInfo.longDay} &middot; {selectedDayInfo.month} {selectedDayInfo.date}
              </h3>
              <button
                onClick={() => { setNewTaskDate(selectedDate); setShowNewTask(true) }}
                className="text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium flex items-center gap-1"
              >
                <Plus size={14} /> Add Task
              </button>
            </div>

            {selectedDayTasks.length > 0 || selectedDaySubtasks.length > 0 ? (
              <div className="space-y-2">
                {/* Regular Tasks */}
                {selectedDayTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canCheck={canCheck}
                    onStatusChange={handleStatusChange}
                    onTaskDeleted={handleTaskDeleted}
                    onTaskUpdated={loadTasks}
                    compact
                  />
                ))}

                {/* Project Subtasks */}
                {selectedDaySubtasks.map(subtask => (
                  <SubtaskCalendarCard
                    key={subtask.id}
                    subtask={subtask}
                    canCheck={canCheck}
                    canEdit={canEdit}
                    onStatusTap={handleSubtaskStatusTap}
                    onSubtaskUpdated={loadTasks}
                  />
                ))}
              </div>
            ) : (
              <div className="glass rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500">No tasks for this day</p>
                <button
                  onClick={() => { setNewTaskDate(selectedDate); setShowNewTask(true) }}
                  className="mt-2 text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium"
                >
                  Create one
                </button>
              </div>
            )}
          </motion.div>

          {/* Full Week Overview - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-mps-blue-600" />
              Full Week Overview
            </h3>
            <div className="overflow-x-auto pb-2 -mx-4 px-4">
              <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                {weekDays.map((day) => {
                  const dayTasks = getTasksForDay(day.full)
                  const daySubs = getSubtasksForDay(day.full)
                  const allItems = [...dayTasks, ...daySubs]
                  const isToday = day.full === todayStr
                  const isSelected = day.full === selectedDate

                  return (
                    <div
                      key={day.full}
                      className={`flex-shrink-0 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-mps-blue-300 bg-mps-blue-50/50'
                          : isToday
                            ? 'border-mps-green-200 bg-mps-green-50/30'
                            : 'border-slate-100 bg-white/80 hover:border-slate-200'
                      }`}
                      style={{ width: '180px' }}
                      onClick={() => setSelectedDate(day.full)}
                    >
                      {/* Day header */}
                      <div className={`px-3 py-2 border-b ${
                        isSelected ? 'border-mps-blue-200' : isToday ? 'border-mps-green-100' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`text-xs font-medium ${
                              isSelected ? 'text-mps-blue-700' : isToday ? 'text-mps-green-700' : 'text-slate-500'
                            }`}>
                              {day.day}
                            </span>
                            <span className={`text-sm font-bold ml-1.5 ${
                              isSelected ? 'text-mps-blue-700' : isToday ? 'text-mps-green-700' : 'text-slate-800'
                            }`}>
                              {day.date}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {allItems.length > 0 ? `${allItems.length}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Compact task list */}
                      <div className="p-1.5 space-y-1 min-h-[60px] max-h-[200px] overflow-y-auto">
                        {allItems.length > 0 ? allItems.map((item, idx) => {
                          const isSubtask = 'project_id' in item
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50/80 text-[11px]"
                            >
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[item.status]}`} />
                              <span className="truncate text-slate-700 flex-1">
                                {item.title}
                              </span>
                              {isSubtask && (
                                <FolderKanban size={9} className="text-purple-400 flex-shrink-0" />
                              )}
                            </div>
                          )
                        }) : (
                          <p className="text-[10px] text-slate-400 text-center py-3">No tasks</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Overdue & Undated */}
          {overdueUndated.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Overdue &amp; Undated ({overdueUndated.length})
              </h3>
              <div className="space-y-2">
                {overdueUndated.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canCheck={canCheck}
                    onStatusChange={handleStatusChange}
                    onTaskDeleted={handleTaskDeleted}
                    onTaskUpdated={loadTasks}
                    compact
                  />
                ))}
              </div>
            </motion.div>
          )}
        </>
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

// Compact inline card for project subtasks in the calendar
function SubtaskCalendarCard({
  subtask,
  canCheck,
  canEdit,
  onStatusTap,
  onSubtaskUpdated,
}: {
  subtask: SubtaskWithProject
  canCheck: boolean
  canEdit: boolean
  onStatusTap: (s: SubtaskWithProject) => void
  onSubtaskUpdated: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div
        className="glass rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsOpen(true)}
      >
        {/* Status button */}
        <button
          onClick={(e) => { e.stopPropagation(); onStatusTap(subtask) }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 font-semibold text-[11px] transition-all active:scale-95 hover:shadow-md ${STATUS_COLORS[subtask.status]}`}
          title={`${STATUS_LABELS[subtask.status]} - tap to change`}
        >
          <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[subtask.status]}`} />
          {STATUS_LABELS[subtask.status]}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${
            subtask.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-800'
          }`}>
            {subtask.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded font-medium flex items-center gap-0.5">
              <FolderKanban size={8} />
              {subtask.project_title}
            </span>
            {subtask.timing && (
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Clock size={8} /> {subtask.timing}
              </span>
            )}
            {subtask.tag === 'bonus' && (
              <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-0.5">
                <Star size={7} /> Bonus
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
      </div>

      {/* Detail Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <SubtaskDetailModal
              subtask={subtask}
              canCheck={canCheck}
              canEdit={canEdit}
              onClose={() => setIsOpen(false)}
              onStatusTap={onStatusTap}
              onSubtaskUpdated={onSubtaskUpdated}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ============================================
// Subtask Detail Modal with Edit Support
// ============================================
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
  const [editTag, setEditTag] = useState<TaskTag>(subtask.tag || null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    const ok = await updateSubtask(subtask.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      due_date: editDueDate || null,
      timing: editTiming || null,
      tag: editTag,
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
    setEditTag(subtask.tag || null)
    setEditing(true)
  }

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onStatusTap(subtask)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { e.stopPropagation(); onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleStatusClick}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 hover:shadow-lg ${STATUS_COLORS[subtask.status]}`}
              title="Tap to change status"
            >
              <div className={`w-3.5 h-3.5 rounded-full ${STATUS_DOT_COLORS[subtask.status]} animate-pulse`} />
              {STATUS_LABELS[subtask.status]}
              <ChevronRight size={14} className="opacity-50" />
            </button>
            {subtask.tag === 'bonus' && !editing && (
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1">
                <Star size={10} /> Bonus
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={handleStartEdit}
                className="p-2 text-mps-blue-500 hover:text-mps-blue-700 hover:bg-mps-blue-50 rounded-lg transition-colors"
                title="Edit subtask"
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
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tag</label>
                <select
                  value={editTag || ''}
                  onChange={e => setEditTag(e.target.value === 'bonus' ? 'bonus' : null)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                >
                  <option value="">No tag</option>
                  <option value="bonus">Bonus</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="btn-secondary text-sm"
                >
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

              {/* Project badge */}
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

              {/* Meta info */}
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

              {/* Assignee */}
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
