'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, AlertTriangle, CalendarOff, CheckCircle2, Circle, CircleDot, ShieldCheck } from 'lucide-react'
import TaskCard from './TaskCard'
import NewTaskForm from './NewTaskForm'
import { fetchTodayTasks, TaskWithDetails, TaskStatus } from '@/lib/tasks'
import { UserProfile } from '@/lib/supabase'

interface TodayTaskListProps {
  userId: string
  profile: UserProfile
  canCheck: boolean
  canAssignToOthers: boolean
  availableAssignees: UserProfile[]
  viewingUserId?: string
}

export default function TodayTaskList({
  userId,
  profile,
  canCheck,
  canAssignToOthers,
  availableAssignees,
  viewingUserId,
}: TodayTaskListProps) {
  const [todayTasks, setTodayTasks] = useState<TaskWithDetails[]>([])
  const [overdueUndated, setOverdueUndated] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)

  const targetUserId = viewingUserId || userId

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const data = await fetchTodayTasks(targetUserId)
    setTodayTasks(data.today)
    setOverdueUndated(data.overdueOrUndated)
    setLoading(false)
  }, [targetUserId])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const updateList = (list: TaskWithDetails[]) =>
      list.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    setTodayTasks(updateList)
    setOverdueUndated(updateList)
  }

  const handleTaskDeleted = (taskId: string) => {
    setTodayTasks(prev => prev.filter(t => t.id !== taskId))
    setOverdueUndated(prev => prev.filter(t => t.id !== taskId))
  }

  // Count statuses
  const allTasks = [...todayTasks, ...overdueUndated]
  const counts = {
    not_done: allTasks.filter(t => t.status === 'not_done').length,
    partial: allTasks.filter(t => t.status === 'partial').length,
    done: allTasks.filter(t => t.status === 'done').length,
    checked: allTasks.filter(t => t.status === 'checked').length,
  }

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header with New Task */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-800">Today&apos;s Tasks</h2>
          <p className="text-sm text-slate-500">{todayStr}</p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Circle size={14} className="text-red-500" />
            <span className="text-lg font-bold text-red-600">{counts.not_done}</span>
          </div>
          <p className="text-xs text-slate-500">Not Done</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CircleDot size={14} className="text-amber-500" />
            <span className="text-lg font-bold text-amber-600">{counts.partial}</span>
          </div>
          <p className="text-xs text-slate-500">Partial</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle2 size={14} className="text-green-500" />
            <span className="text-lg font-bold text-green-600">{counts.done}</span>
          </div>
          <p className="text-xs text-slate-500">Done</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ShieldCheck size={14} className="text-blue-500" />
            <span className="text-lg font-bold text-blue-600">{counts.checked}</span>
          </div>
          <p className="text-xs text-slate-500">Checked</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading tasks...</p>
        </div>
      ) : (
        <>
          {/* Today's Task List */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-mps-blue-500" />
              Today ({todayTasks.length})
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
              <div className="glass rounded-xl p-8 text-center">
                <CheckCircle2 size={32} className="text-mps-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No tasks scheduled for today</p>
              </div>
            )}
          </div>

          {/* Overdue & Undated */}
          {overdueUndated.length > 0 && (
            <div>
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
            </div>
          )}
        </>
      )}

      <NewTaskForm
        isOpen={showNewTask}
        onClose={() => setShowNewTask(false)}
        onTaskCreated={loadTasks}
        currentUserId={userId}
        defaultAssigneeId={targetUserId}
        defaultDate={new Date().toISOString().split('T')[0]}
        availableAssignees={availableAssignees}
        canAssignToOthers={canAssignToOthers}
      />
    </div>
  )
}
