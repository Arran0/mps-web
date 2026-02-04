'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, AlertTriangle } from 'lucide-react'
import TaskCard from './TaskCard'
import NewTaskForm from './NewTaskForm'
import {
  fetchWeekTasks,
  fetchTodayTasks,
  TaskWithDetails,
  TaskStatus,
  STATUS_DOT_COLORS,
} from '@/lib/tasks'
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
  const [overdueUndated, setOverdueUndated] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [showWeekView, setShowWeekView] = useState(true)

  const targetUserId = viewingUserId || userId
  const todayStr = formatDate(new Date())

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const weekData = await fetchWeekTasks(targetUserId, weekStart)
    setTasks(weekData)
    const todayData = await fetchTodayTasks(targetUserId)
    setOverdueUndated(todayData.overdueOrUndated)
    setLoading(false)
  }, [targetUserId, weekStart])

  useEffect(() => { loadTasks() }, [loadTasks])

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
  }

  const getTasksForDay = (dateStr: string) => tasks.filter(t => t.due_date === dateStr)

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    setOverdueUndated(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setOverdueUndated(prev => prev.filter(t => t.id !== taskId))
  }

  const weekLabel = `${weekDays[0].month} ${weekDays[0].date} – ${weekDays[6].month} ${weekDays[6].date}`

  const todayTasks = getTasksForDay(todayStr)
  const counts = {
    not_done: todayTasks.filter(t => t.status === 'not_done').length,
    partial: todayTasks.filter(t => t.status === 'partial').length,
    done: todayTasks.filter(t => t.status === 'done').length,
    checked: todayTasks.filter(t => t.status === 'checked').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800">Weekly Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWeekView(!showWeekView)}
            className={`p-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              showWeekView ? 'bg-mps-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Full Week</span>
          </button>
          <button
            onClick={() => { setNewTaskDate(todayStr); setShowNewTask(true) }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between glass rounded-xl p-3">
        <button onClick={goToPrevWeek} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-800">{weekLabel}</p>
          <button onClick={goToThisWeek} className="text-xs text-mps-blue-600 hover:text-mps-blue-700 font-medium">
            This Week
          </button>
        </div>
        <button onClick={goToNextWeek} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Today Status Summary */}
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
              <span className={`text-lg font-bold ${s.color}`}>{counts[s.key]}</span>
            </div>
            <p className="text-[10px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading calendar...</p>
        </div>
      ) : (
        <>
          {/* Day Selector Row */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day) => {
              const dayTasks = getTasksForDay(day.full)
              const isToday = day.full === todayStr

              return (
                <button
                  key={day.full}
                  onClick={() => { setNewTaskDate(day.full); setShowNewTask(true) }}
                  className={`rounded-xl p-2 text-center transition-all border-2 ${
                    isToday
                      ? 'border-mps-green-400 bg-mps-green-50'
                      : 'border-transparent glass hover:border-slate-200'
                  }`}
                >
                  <p className={`text-[10px] font-medium ${isToday ? 'text-mps-green-700' : 'text-slate-500'}`}>
                    {day.day}
                  </p>
                  <p className={`text-base font-bold ${isToday ? 'text-mps-green-700' : 'text-slate-800'}`}>
                    {day.date}
                  </p>
                  {dayTasks.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-1">
                      {dayTasks.slice(0, 4).map(t => (
                        <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[t.status]}`} />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="text-[7px] text-slate-400">+{dayTasks.length - 4}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Full Week Overview - Horizontal scrollable columns */}
          {showWeekView && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <LayoutGrid size={16} className="text-mps-blue-600" />
                Full Week Overview
              </h3>
              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {weekDays.map((day) => {
                    const dayTasks = getTasksForDay(day.full)
                    const isToday = day.full === todayStr

                    return (
                      <div
                        key={day.full}
                        className={`flex-shrink-0 rounded-2xl border-2 ${
                          isToday ? 'border-mps-green-300 bg-mps-green-50/50' : 'border-slate-100 bg-white/80'
                        }`}
                        style={{ width: '220px' }}
                      >
                        {/* Day header */}
                        <div className={`px-3 py-2 border-b ${isToday ? 'border-mps-green-200' : 'border-slate-100'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`text-xs font-medium ${isToday ? 'text-mps-green-700' : 'text-slate-500'}`}>
                                {day.day}
                              </span>
                              <span className={`text-sm font-bold ml-1.5 ${isToday ? 'text-mps-green-700' : 'text-slate-800'}`}>
                                {day.date}
                              </span>
                            </div>
                            <button
                              onClick={() => { setNewTaskDate(day.full); setShowNewTask(true) }}
                              className="p-1 text-slate-400 hover:text-mps-blue-600 hover:bg-mps-blue-50 rounded transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {dayTasks.length > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</p>
                          )}
                        </div>

                        {/* Tasks */}
                        <div className="p-2 space-y-1.5 min-h-[80px] max-h-[300px] overflow-y-auto">
                          {dayTasks.length > 0 ? dayTasks.map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              canCheck={canCheck}
                              onStatusChange={handleStatusChange}
                              onTaskDeleted={handleTaskDeleted}
                              onTaskUpdated={loadTasks}
                              compact
                            />
                          )) : (
                            <p className="text-[10px] text-slate-400 text-center py-4">No tasks</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Today's Tasks (when week view is off) */}
          {!showWeekView && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-semibold text-slate-700 mb-3">
                Today &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              {todayTasks.length > 0 ? (
                <div className="space-y-2">
                  {todayTasks.map(task => (
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
              ) : (
                <div className="glass rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">No tasks for today</p>
                </div>
              )}
            </motion.div>
          )}

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
