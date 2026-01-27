'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { canViewTeamAnalytics } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  CalendarDays,
  BarChart3,
  LayoutDashboard,
  Users,
  Construction,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

type TabId = 'today' | 'weekly' | 'analytics' | 'dashboard' | 'team'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  description: string
  requiresTeamAccess?: boolean
}

const tabs: Tab[] = [
  { id: 'today', label: "Today's Task List", icon: <ClipboardList size={18} />, description: 'View and manage your daily tasks' },
  { id: 'weekly', label: 'Weekly Calendar', icon: <CalendarDays size={18} />, description: 'Plan your week with the task calendar' },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, description: 'Track your productivity and task completion' },
  { id: 'dashboard', label: 'Advanced Dashboard', icon: <LayoutDashboard size={18} />, description: 'Access detailed insights and metrics' },
  { id: 'team', label: 'Team Analytics', icon: <Users size={18} />, description: 'View team performance and collaboration', requiresTeamAccess: true },
]

function TasksPageContent() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('today')

  const showTeamAnalytics = profile ? canViewTeamAnalytics(profile.role) : false

  const visibleTabs = tabs.filter(tab => {
    if (tab.requiresTeamAccess && !showTeamAnalytics) return false
    return true
  })

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['today', 'weekly', 'analytics', 'dashboard', 'team'].includes(tabParam)) {
      if (tabParam === 'team' && !showTeamAnalytics) {
        setActiveTab('today')
      } else {
        setActiveTab(tabParam as TabId)
      }
    }
  }, [searchParams, showTeamAnalytics])

  const activeTabData = visibleTabs.find(t => t.id === activeTab) || visibleTabs[0]

  return (
    <ProtectedLayout staffOnly>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
              <ClipboardList className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Task Manager</h1>
              <p className="text-slate-500 text-sm">Manage and track your tasks efficiently</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
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
        </div>

        {/* Under Construction Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center py-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="relative w-32 h-32 mx-auto mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full animate-pulse-soft" />
            <div className="absolute inset-2 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Construction className="w-14 h-14 text-amber-500" strokeWidth={1.5} />
            </div>
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full"
              animate={{ y: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.div
              className="absolute -bottom-1 -left-1 w-4 h-4 bg-orange-400 rounded-full"
              animate={{ y: [5, -5, 5] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            />
          </motion.div>

          <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
            <Construction size={16} />
            Under Construction
          </span>

          <h2 className="font-display text-2xl font-bold text-slate-800 mt-4 mb-3">
            {activeTabData.label}
          </h2>

          <p className="text-slate-500 leading-relaxed mb-8 max-w-md mx-auto">
            {activeTabData.description}. This feature is coming soon!
          </p>

          <Link href="/home">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back to Home
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <ProtectedLayout staffOnly>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
