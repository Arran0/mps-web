'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, X } from 'lucide-react'
import TaskCard from './TaskCard'
import { fetchFilteredTasks, TaskWithDetails, TaskStatus, TaskFilter, STATUS_LABELS } from '@/lib/tasks'

interface AdvancedDashboardProps {
  userId: string
  viewingUserId?: string
  canCheck: boolean
}

export default function AdvancedDashboard({ userId, viewingUserId, canCheck }: AdvancedDashboardProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterOverdue, setFilterOverdue] = useState<'' | 'yes' | 'no'>('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const targetUserId = viewingUserId || userId

  const handleSearch = useCallback(async () => {
    setLoading(true)
    const filter: TaskFilter = {}
    if (filterStatus) filter.status = filterStatus as TaskStatus
    if (filterOverdue === 'yes') filter.is_overdue = true
    if (filterOverdue === 'no') filter.is_overdue = false
    if (filterDateFrom) filter.due_date_from = filterDateFrom
    if (filterDateTo) filter.due_date_to = filterDateTo

    const results = await fetchFilteredTasks(targetUserId, filter)
    setTasks(results)
    setLoading(false)
    setHasSearched(true)
  }, [targetUserId, filterStatus, filterOverdue, filterDateFrom, filterDateTo])

  const clearFilters = () => {
    setFilterStatus('')
    setFilterOverdue('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setTasks([])
    setHasSearched(false)
  }

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const hasActiveFilters = filterStatus || filterOverdue || filterDateFrom || filterDateTo

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-slate-800">Advanced Dashboard</h2>

      {/* Filter Panel */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-mps-blue-600" />
          <h3 className="font-semibold text-slate-700">Filter Tasks</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Status filter */}
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
            >
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Overdue filter */}
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1 block">Overdue</label>
            <select
              value={filterOverdue}
              onChange={e => setFilterOverdue(e.target.value as '' | 'yes' | 'no')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
            >
              <option value="">Any</option>
              <option value="yes">Overdue Only</option>
              <option value="no">Not Overdue</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1 block">Due Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1 block">Due Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="btn-primary flex items-center gap-2 text-sm w-full sm:w-auto"
        >
          <Search size={14} />
          {loading ? 'Searching...' : 'Search Tasks'}
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Searching tasks...</p>
        </div>
      ) : hasSearched ? (
        <div>
          <p className="text-sm text-slate-500 mb-3">{tasks.length} task{tasks.length !== 1 ? 's' : ''} found</p>
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  canCheck={canCheck}
                  onStatusChange={handleStatusChange}
                  onTaskDeleted={handleTaskDeleted}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <Search size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No tasks match your filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-xl p-8 text-center">
          <Filter size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Set filter conditions and search to find tasks</p>
        </div>
      )}
    </div>
  )
}
