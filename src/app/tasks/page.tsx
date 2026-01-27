'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { canViewTeamAnalytics } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList,
  CalendarDays,
  BarChart3,
  LayoutDashboard,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter
} from 'lucide-react'

type TabId = 'today' | 'weekly' | 'analytics' | 'dashboard' | 'team'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  requiresTeamAccess?: boolean
}

const tabs: Tab[] = [
  { id: 'today', label: "Today's Task List", icon: <ClipboardList size={18} /> },
  { id: 'weekly', label: 'Weekly Task Calendar', icon: <CalendarDays size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'dashboard', label: 'Advanced Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'team', label: 'Team Analytics', icon: <Users size={18} />, requiresTeamAccess: true },
]

// Demo tasks data
const todayTasks = [
  { id: 1, title: 'Review Class 10A homework submissions', status: 'pending', priority: 'high', time: '9:00 AM' },
  { id: 2, title: 'Prepare lesson plan for Mathematics', status: 'completed', priority: 'normal', time: '10:30 AM' },
  { id: 3, title: 'Parent meeting - Student: John Doe', status: 'in_progress', priority: 'high', time: '2:00 PM' },
  { id: 4, title: 'Submit attendance report', status: 'pending', priority: 'normal', time: '4:00 PM' },
  { id: 5, title: 'Grade Physics test papers', status: 'pending', priority: 'normal', time: '5:00 PM' },
]

const statusColors = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock size={16} /> },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <AlertCircle size={16} /> },
  completed: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle2 size={16} /> },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// Inner component that uses useSearchParams
function TasksPageContent() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('today')

  const showTeamAnalytics = profile ? canViewTeamAnalytics(profile.role) : false

  const visibleTabs = tabs.filter(tab => {
    if (tab.requiresTeamAccess && !showTeamAnalytics) return false
    return true
  })

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['today', 'weekly', 'analytics', 'dashboard', 'team'].includes(tabParam)) {
      // Only set team tab if user has access
      if (tabParam === 'team' && !showTeamAnalytics) {
        setActiveTab('today')
      } else {
        setActiveTab(tabParam as TabId)
      }
    }
  }, [searchParams, showTeamAnalytics])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'today':
        return <TodayTaskList />
      case 'weekly':
        return <WeeklyCalendar />
      case 'analytics':
        return <AnalyticsView />
      case 'dashboard':
        return <AdvancedDashboard />
      case 'team':
        return <TeamAnalytics />
      default:
        return <TodayTaskList />
    }
  }

  return (
    <ProtectedLayout staffOnly>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
                  <ClipboardList className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold text-slate-800">Task Manager</h1>
                  <p className="text-slate-500 text-sm">Manage and track your tasks efficiently</p>
                </div>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="glass rounded-2xl p-2">
              <div className="flex flex-wrap gap-2">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-mps-blue-500 to-mps-green-500 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}

// Wrapper with Suspense for useSearchParams
export default function TasksPage() {
  return (
    <Suspense fallback={
      <ProtectedLayout staffOnly>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="spinner" />
          </div>
        </div>
      </ProtectedLayout>
    }>
      <TasksPageContent />
    </Suspense>
  )
}

// Today's Task List Component
function TodayTaskList() {
  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <Filter size={18} />
          <span>Filter</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">5</p>
          <p className="text-sm text-slate-500">Total Tasks</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">1</p>
          <p className="text-sm text-slate-500">Completed</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">3</p>
          <p className="text-sm text-slate-500">Pending</p>
        </div>
      </div>

      {/* Task List */}
      <div className="glass rounded-2xl divide-y divide-slate-100">
        {todayTasks.map((task, index) => {
          const status = statusColors[task.status as keyof typeof statusColors]
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${status.bg}`}>
                  <span className={status.text}>{status.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 truncate">{task.title}</h4>
                  <p className="text-sm text-slate-500">{task.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  {task.priority === 'high' && (
                    <span className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded-full font-medium">
                      High Priority
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 ${status.bg} ${status.text} rounded-full font-medium capitalize`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Under Construction Notice */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <p className="text-amber-700 text-sm">
          <span className="font-medium">Under Construction:</span> Full task management features coming soon. Currently showing demo content.
        </p>
      </div>
    </div>
  )
}

// Weekly Calendar Component
function WeeklyCalendar() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Weekly Task Calendar</h3>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div key={day} className="text-center">
              <p className="text-sm font-medium text-slate-600 mb-2">{day}</p>
              <div className={`aspect-square rounded-xl flex items-center justify-center ${
                index === 0 ? 'bg-mps-blue-100 text-mps-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                <span className="font-medium">{20 + index}</span>
              </div>
              <div className="mt-2 space-y-1">
                {index < 3 && (
                  <div className="w-2 h-2 rounded-full bg-amber-400 mx-auto" title="Tasks pending" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <p className="text-amber-700 text-sm">
          <span className="font-medium">Under Construction:</span> Interactive weekly calendar coming soon.
        </p>
      </div>
    </div>
  )
}

// Analytics Component
function AnalyticsView() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Task Completion Rate</h3>
          <div className="flex items-end gap-2 h-32">
            {[65, 80, 45, 90, 70, 85, 60].map((height, index) => (
              <div key={index} className="flex-1 bg-gradient-to-t from-mps-blue-500 to-mps-green-400 rounded-t-lg transition-all hover:opacity-80" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Task Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Completed', value: 45, color: 'bg-green-500' },
              { label: 'In Progress', value: 30, color: 'bg-blue-500' },
              { label: 'Pending', value: 25, color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-medium text-slate-800">{item.value}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <p className="text-amber-700 text-sm">
          <span className="font-medium">Under Construction:</span> Detailed analytics and insights coming soon.
        </p>
      </div>
    </div>
  )
}

// Advanced Dashboard Component
function AdvancedDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Productivity Score</h3>
            <LayoutDashboard className="text-mps-blue-500" size={20} />
          </div>
          <p className="text-4xl font-bold text-slate-800">87%</p>
          <p className="text-sm text-green-600 mt-1">+12% from last week</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Tasks This Month</h3>
            <ClipboardList className="text-amber-500" size={20} />
          </div>
          <p className="text-4xl font-bold text-slate-800">156</p>
          <p className="text-sm text-slate-500 mt-1">128 completed</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Avg. Completion</h3>
            <Clock className="text-purple-500" size={20} />
          </div>
          <p className="text-4xl font-bold text-slate-800">2.3h</p>
          <p className="text-sm text-slate-500 mt-1">Per task average</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <p className="text-amber-700 text-sm">
          <span className="font-medium">Under Construction:</span> Advanced dashboard features coming soon.
        </p>
      </div>
    </div>
  )
}

// Team Analytics Component (only for admin/coordinator/principal)
function TeamAnalytics() {
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-mps-blue-500" size={24} />
          <h3 className="font-semibold text-slate-800 text-lg">Team Performance Overview</h3>
        </div>

        <div className="space-y-4">
          {[
            { name: 'John Smith', role: 'Teacher', tasks: 24, completed: 20 },
            { name: 'Sarah Johnson', role: 'Teacher', tasks: 18, completed: 18 },
            { name: 'Michael Brown', role: 'Coordinator', tasks: 32, completed: 28 },
            { name: 'Emily Davis', role: 'Teacher', tasks: 15, completed: 12 },
          ].map((member, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white font-medium">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{member.name}</p>
                <p className="text-sm text-slate-500">{member.role}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-800">{member.completed}/{member.tasks}</p>
                <p className="text-sm text-slate-500">Tasks</p>
              </div>
              <div className="w-24">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-mps-blue-500 to-mps-green-500 rounded-full"
                    style={{ width: `${(member.completed / member.tasks) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <p className="text-amber-700 text-sm">
          <span className="font-medium">Under Construction:</span> Full team analytics features coming soon.
        </p>
      </div>
    </div>
  )
}
