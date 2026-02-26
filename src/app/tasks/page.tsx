'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { canViewTeamAnalytics, UserProfile } from '@/lib/supabase'
import { fetchTeamMembers } from '@/lib/tasks'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  CalendarDays,
  BarChart3,
  LayoutDashboard,
  Users,
  FolderKanban,
} from 'lucide-react'
import WeeklyCalendar from '@/components/tasks/WeeklyCalendar'
import TaskAnalytics from '@/components/tasks/TaskAnalytics'
import AdvancedDashboard from '@/components/tasks/AdvancedDashboard'
import TeamAnalytics from '@/components/tasks/TeamAnalytics'
import TeamMemberSelector from '@/components/tasks/TeamMemberSelector'
import ProjectsList from '@/components/tasks/ProjectsList'

type TabId = 'weekly' | 'analytics' | 'team' | 'projects' | 'dashboard'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: 'weekly', label: 'Weekly Calendar', icon: <CalendarDays size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'team', label: 'Team Analytics', icon: <Users size={18} /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
]

function TasksPageContent() {
  const { user, profile } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('weekly')
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([])
  const [viewingUserId, setViewingUserId] = useState<string>('')

  const showTeamAnalytics = profile ? canViewTeamAnalytics(profile.role) : false
  const canAssignToOthers = profile ? ['coordinator', 'principal', 'admin'].includes(profile.role) : false
  // Teachers can cycle: not_done -> partial -> done
  // Coordinators, principals, admins can also set: done -> checked
  const canCheck = profile ? ['coordinator', 'principal', 'admin'].includes(profile.role) : false

  const visibleTabs = tabs.filter(tab => {
    if (tab.id === 'team' && !showTeamAnalytics) return false
    return true
  })

  // Load team members for coordinator/principal/admin
  const loadTeamMembers = useCallback(async () => {
    if (!user || !profile || !canAssignToOthers) return
    const members = await fetchTeamMembers(user.id, profile.role)
    setTeamMembers(members)
  }, [user, profile, canAssignToOthers])

  useEffect(() => {
    loadTeamMembers()
  }, [loadTeamMembers])

  useEffect(() => {
    if (user) setViewingUserId(user.id)
  }, [user])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['weekly', 'analytics', 'dashboard', 'team', 'projects'].includes(tabParam)) {
      if (tabParam === 'team' && !showTeamAnalytics) {
        setActiveTab('weekly')
      } else {
        setActiveTab(tabParam as TabId)
      }
    }
  }, [searchParams, showTeamAnalytics])

  if (!user || !profile) return null

  // Include self + team members for assignee options
  const allAssignees: UserProfile[] = [
    profile,
    ...teamMembers,
  ]

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

        {/* Navigation Tabs + inline space selector */}
        <div className="mb-5">
          <div className="glass rounded-2xl px-2 py-1.5 flex items-center gap-2 flex-wrap">
            <div className="flex flex-wrap gap-1 flex-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
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
            {canAssignToOthers && teamMembers.length > 0 && activeTab !== 'team' && activeTab !== 'projects' && (
              <TeamMemberSelector
                members={teamMembers}
                selectedUserId={viewingUserId}
                currentUserId={user.id}
                currentUserName={profile.full_name}
                onSelect={setViewingUserId}
              />
            )}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={`${activeTab}-${viewingUserId}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'weekly' && (
            <WeeklyCalendar
              userId={user.id}
              profile={profile}
              canCheck={canCheck}
              canAssignToOthers={canAssignToOthers}
              availableAssignees={allAssignees}
              viewingUserId={viewingUserId !== user.id ? viewingUserId : undefined}
            />
          )}

          {activeTab === 'analytics' && (
            <TaskAnalytics
              userId={user.id}
              viewingUserId={viewingUserId !== user.id ? viewingUserId : undefined}
            />
          )}

          {activeTab === 'team' && showTeamAnalytics && (
            <TeamAnalytics
              userId={user.id}
              userRole={profile.role}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsList
              userId={user.id}
              userRole={profile.role}
              canEdit={canAssignToOthers}
              canCheck={canCheck}
              availableAssignees={allAssignees}
            />
          )}

          {activeTab === 'dashboard' && (
            <AdvancedDashboard
              userId={user.id}
              viewingUserId={viewingUserId !== user.id ? viewingUserId : undefined}
              canCheck={canCheck}
            />
          )}
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
