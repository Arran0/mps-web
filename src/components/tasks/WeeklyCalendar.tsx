'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react'
import TaskCard from './TaskCard'
import NewTaskForm from './NewTaskForm'
import {
  fetchWeekTasks,
  TaskWithDetails,
  TaskStatus,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
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
  return date.toISOString().split('T')[0]
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
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [showWeekView, setShowWeekView] = useState(false)

  const targetUserId = viewingUserId || userId

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const data = await fetchWeekTasks(targetUserId, weekStart)
    setTasks(data)
    setLoading(false)
  }, [targetUserId, weekStart])

  useEffect(() => { loadTasks() }, [loadTasks])

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return getDayLabel(d)
  })

  const todayStr = formatDate(new Date())

  const goToPrevWeek = () => {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 7)
    setWeekStart(prev)
    setSelectedDay(null)
  }

  const goToNextWeek = () => {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    setWeekStart(next)
    setSelectedDay(null)
  }

  const goToThisWeek = () => {
    setWeekStart(getWeekStart(new Date()))
    setSelectedDay(null)
  }

  const handleDayClick = (dateStr: string) => {
    if (selectedDay === dateStr) {
      setNewTaskDate(dateStr)
      setShowNewTask(true)
    } else {
      setSelectedDay(dateStr)
    }
  }

  const getTasksForDay = (dateStr: string) => tasks.filter(t => t.due_date === dateStr)

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const weekLabel = `${weekDays[0].month} ${weekDays[0].date} - ${weekDays[6].month} ${weekDays[6].date}`

  return (
    <div className="space-y-6">
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
            <span className="hidden sm:inline">Week View</span>
          </button>
          <button
            onClick={() => { setNewTaskDate(''); setShowNewTask(true) }}
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

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading calendar...</p>
        </div>
      ) : (
        <>
          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayTasks = getTasksForDay(day.full)
              const isToday = day.full === todayStr
              const isSelected = day.full === selectedDay

              return (
                <button
                  key={day.full}
                  onClick={() => handleDayClick(day.full)}
                  className={`rounded-xl p-3 text-center transition-all border-2 ${
                    isSelected
                      ? 'border-mps-blue-500 bg-mps-blue-50 shadow-md'
                      : isToday
                        ? 'border-mps-green-400 bg-mps-green-50'
                        : 'border-transparent glass hover:border-slate-200'
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${isToday ? 'text-mps-green-700' : 'text-slate-500'}`}>
                    {day.day}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? 'text-mps-green-700' : isSelected ? 'text-mps-blue-700' : 'text-slate-800'}`}>
                    {day.date}
                  </p>
                  {dayTasks.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-1.5">
                      {dayTasks.slice(0, 4).map(t => (
                        <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[t.status]}`} />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="text-[8px] text-slate-400 leading-none">+{dayTasks.length - 4}</span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {dayTasks.length > 0 ? `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}` : ''}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Selected Day Tasks */}
          {selectedDay && !showWeekView && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => { setNewTaskDate(selectedDay); setShowNewTask(true) }}
                  className="text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus size={14} /> Add Task
                </button>
              </div>
              {getTasksForDay(selectedDay).length > 0 ? (
                <div className="space-y-2">
                  {getTasksForDay(selectedDay).map(task => (
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
                  <p className="text-sm text-slate-500">No tasks for this day</p>
                  <button
                    onClick={() => { setNewTaskDate(selectedDay); setShowNewTask(true) }}
                    className="mt-2 text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium"
                  >
                    Create a task
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Whole Week View - shows ALL tasks for the week at a glance */}
          {showWeekView && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <LayoutGrid size={16} className="text-mps-blue-600" />
                Full Week Overview
              </h3>
              <div className="glass rounded-2xl overflow-hidden">
                {weekDays.map((day) => {
                  const dayTasks = getTasksForDay(day.full)
                  const isToday = day.full === todayStr

                  return (
                    <div
                      key={day.full}
                      className={`border-b border-slate-100 last:border-b-0 ${isToday ? 'bg-mps-green-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3 p-3">
                        {/* Day label */}
                        <div className={`w-14 text-center flex-shrink-0 pt-0.5 ${isToday ? 'text-mps-green-700' : 'text-slate-500'}`}>
                          <p className="text-xs font-medium">{day.day}</p>
                          <p className={`text-lg font-bold ${isToday ? 'text-mps-green-700' : 'text-slate-800'}`}>{day.date}</p>
                        </div>

                        {/* Tasks for this day */}
                        <div className="flex-1 min-w-0">
                          {dayTasks.length > 0 ? (
                            <div className="space-y-1.5">
                              {dayTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[task.status]}`} />
                                  <span className={`text-sm truncate ${task.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                    {task.title}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${STATUS_COLORS_INLINE[task.status]}`}>
                                    {STATUS_LABELS[task.status]}
                                  </span>
                                  {task.timing && (
                                    <span className="text-[10px] text-slate-400 flex-shrink-0">{task.timing}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 py-1">No tasks</p>
                          )}
                        </div>

                        {/* Add button */}
                        <button
                          onClick={() => { setNewTaskDate(day.full); setShowNewTask(true) }}
                          className="p-1 text-slate-400 hover:text-mps-blue-600 hover:bg-mps-blue-50 rounded transition-colors flex-shrink-0"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
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

// Inline status colors (smaller badges for week view)
const STATUS_COLORS_INLINE: Record<TaskStatus, string> = {
  not_done: 'bg-red-50 text-red-600 border-red-200',
  partial: 'bg-amber-50 text-amber-600 border-amber-200',
  done: 'bg-green-50 text-green-600 border-green-200',
  checked: 'bg-blue-50 text-blue-600 border-blue-200',
}
