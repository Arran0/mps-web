'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  CalendarDays, Plus, Clock, CheckCircle, History, Database,
} from 'lucide-react'
import LeaveApplicationForm from '@/components/leave/LeaveApplicationForm'
import LeaveApplicationCard from '@/components/leave/LeaveApplicationCard'
import LeaveBalanceCard from '@/components/leave/LeaveBalanceCard'
import {
  LeaveApplicationWithDetails,
  fetchMyLeaveApplications,
  fetchPendingApprovalsForUser,
  fetchLeaveBalance,
  fetchAllLeaveApplications,
} from '@/lib/leave'

type TabId = 'active' | 'pending' | 'history' | 'all'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function StaffLeavePage() {
  const { user, profile } = useAuth()

  const isAdmin      = profile?.role === 'admin'
  const isPrincipal  = profile?.role === 'principal'
  const isTeacher    = profile?.role === 'teacher'
  const canApply     = !isAdmin
  const canReview    = profile?.role ? ['teacher', 'coordinator', 'principal'].includes(profile.role) : false
  const showAllRecords = isAdmin || isPrincipal

  const defaultTab: TabId = isAdmin ? 'all' : 'active'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const [myApplications, setMyApplications]     = useState<LeaveApplicationWithDetails[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<LeaveApplicationWithDetails[]>([])
  const [allApplications, setAllApplications]   = useState<LeaveApplicationWithDetails[]>([])
  const [balance, setBalance] = useState({ casual: { used: 0, total: 12 }, medical: { used: 0, total: 15 } })

  const loadData = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)

    try {
      const promises: Promise<unknown>[] = []

      if (!isAdmin) {
        promises.push(
          fetchMyLeaveApplications(user.id).then(setMyApplications),
          fetchLeaveBalance(user.id).then(setBalance),
        )
      }

      if (canReview && !isAdmin) {
        promises.push(
          fetchPendingApprovalsForUser(user.id, profile.role).then(setPendingApprovals)
        )
      }

      if (showAllRecords) {
        promises.push(
          fetchAllLeaveApplications().then(setAllApplications)
        )
        // Admin still needs pending approvals for their own review role
        if (isAdmin) {
          promises.push(
            fetchPendingApprovalsForUser(user.id, profile.role).then(setPendingApprovals)
          )
        }
      }

      await Promise.all(promises)
    } catch (err) {
      console.error('Failed to load leave data:', err)
    }

    setLoading(false)
  }, [user, profile, isAdmin, canReview, showAllRecords])

  useEffect(() => { loadData() }, [loadData])

  if (!user || !profile) return null

  const activeApplications = myApplications.filter(a => a.status === 'pending')
  const pastApplications   = myApplications.filter(a => a.status !== 'pending')

  // Build tab list based on role
  const tabs: { id: TabId; label: string; Icon: React.ElementType; count?: number }[] = []

  if (!isAdmin) {
    tabs.push({ id: 'active',   label: 'My Active', Icon: CalendarDays, count: activeApplications.length })
    if (canReview) tabs.push({ id: 'pending', label: 'Review',    Icon: Clock, count: pendingApprovals.length })
    tabs.push({ id: 'history',  label: 'My History', Icon: History,     count: pastApplications.length })
  }

  if (showAllRecords) {
    tabs.push({ id: 'all', label: isPrincipal ? 'All Records' : 'All Records', Icon: Database, count: allApplications.length })
  }

  // For admin, show only "All Records"
  const visibleTabs = isAdmin ? [{ id: 'all' as TabId, label: 'All Records', Icon: Database, count: allApplications.length }] : tabs

  return (
    <ProtectedLayout staffOnly>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl shadow-lg">
                <CalendarDays className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-800">
                  {isAdmin ? 'Leave Records' : 'Staff Leave'}
                </h1>
                <p className="text-slate-500 text-sm">
                  {isAdmin ? 'View all leave applications across the school' : 'Manage your leave applications'}
                </p>
              </div>
            </div>
            {canApply && (
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Apply Leave</span>
                <span className="sm:hidden">Apply</span>
              </button>
            )}
          </div>
        </div>

        {/* Leave Balance (not for admin) */}
        {!isAdmin && (
          <div className="mb-6">
            <LeaveBalanceCard casual={balance.casual} medical={balance.medical} />
          </div>
        )}

        {/* Tabs */}
        <div className="glass rounded-2xl p-1.5 mb-6 flex flex-wrap gap-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex-1 justify-center sm:flex-none ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ').pop()}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-white/25' : 'bg-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="text-center py-12">
                <div className="spinner mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading…</p>
              </div>
            ) : (
              <>
                {/* My Active */}
                {activeTab === 'active' && (
                  activeApplications.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <CalendarDays size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm mb-3">No active leave applications</p>
                      {canApply && (
                        <button onClick={() => setShowNewForm(true)}
                          className="text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium">
                          Apply for leave
                        </button>
                      )}
                    </div>
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                      {activeApplications.map(app => (
                        <motion.div key={app.id} variants={itemVariants}>
                          <LeaveApplicationCard application={app} currentUserId={user.id} currentUserRole={profile.role} onStatusChange={loadData} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                )}

                {/* Pending Review */}
                {activeTab === 'pending' && (
                  pendingApprovals.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <CheckCircle size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No pending approvals</p>
                    </div>
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                      {pendingApprovals.map(app => (
                        <motion.div key={app.id} variants={itemVariants}>
                          <LeaveApplicationCard application={app} currentUserId={user.id} currentUserRole={profile.role} isApprover={true} onStatusChange={loadData} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                )}

                {/* History */}
                {activeTab === 'history' && (
                  pastApplications.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <History size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No leave history yet</p>
                    </div>
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                      {pastApplications.map(app => (
                        <motion.div key={app.id} variants={itemVariants}>
                          <LeaveApplicationCard application={app} currentUserId={user.id} currentUserRole={profile.role} onStatusChange={loadData} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                )}

                {/* All Records (Principal + Admin) */}
                {activeTab === 'all' && (
                  allApplications.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <Database size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No leave applications on record</p>
                    </div>
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                      {allApplications.map(app => (
                        <motion.div key={app.id} variants={itemVariants}>
                          <LeaveApplicationCard
                            application={app}
                            currentUserId={user.id}
                            currentUserRole={profile.role}
                            isApprover={!isAdmin && isPrincipal}
                            onStatusChange={loadData}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* New Application Form */}
        {canApply && (
          <LeaveApplicationForm
            isOpen={showNewForm}
            onClose={() => setShowNewForm(false)}
            onCreated={loadData}
            userId={user.id}
            userRole={profile.role}
          />
        )}
      </div>
    </ProtectedLayout>
  )
}
