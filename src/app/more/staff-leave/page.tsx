'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle,
  History,
  AlertCircle,
} from 'lucide-react'
import LeaveApplicationForm from '@/components/leave/LeaveApplicationForm'
import LeaveApplicationCard from '@/components/leave/LeaveApplicationCard'
import LeaveBalanceCard from '@/components/leave/LeaveBalanceCard'
import {
  LeaveApplicationWithDetails,
  fetchMyLeaveApplications,
  fetchPendingApprovalsForUser,
  fetchLeaveBalance,
} from '@/lib/leave'

type TabId = 'my-leaves' | 'active' | 'pending' | 'history'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function StaffLeavePage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>(profile?.role === 'admin' ? 'pending' : 'active')
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(true)

  // Data states
  const [myApplications, setMyApplications] = useState<LeaveApplicationWithDetails[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<LeaveApplicationWithDetails[]>([])
  const [balance, setBalance] = useState({
    casual: { used: 0, total: 12 },
    medical: { used: 0, total: 15 }
  })

  const isApprover = profile?.role && ['coordinator', 'principal', 'admin'].includes(profile.role)
  const canApply = profile?.role !== 'admin' // Admin cannot apply
  const showPendingReview = profile?.role === 'principal' || profile?.role === 'admin'

  const loadData = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)

    try {
      const [apps, balanceData] = await Promise.all([
        fetchMyLeaveApplications(user.id),
        fetchLeaveBalance(user.id),
      ])
      setMyApplications(apps)
      setBalance(balanceData)

      if (isApprover) {
        const pending = await fetchPendingApprovalsForUser(user.id, profile.role)
        setPendingApprovals(pending)
      }
    } catch (err) {
      console.error('Failed to load leave data:', err)
    }

    setLoading(false)
  }, [user, profile, isApprover])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (!user || !profile) return null

  // Filter applications by tab
  const activeApplications = myApplications.filter(a => a.status === 'pending')
  const pastApplications = myApplications.filter(a => a.status !== 'pending')

  const tabs = [
    ...(canApply ? [{ id: 'active' as TabId, label: 'Active Applications', icon: CalendarDays, count: activeApplications.length }] : []),
    ...(showPendingReview ? [{ id: 'pending' as TabId, label: 'Pending Review', icon: Clock, count: pendingApprovals.length }] : []),
    { id: 'history' as TabId, label: 'History', icon: History, count: pastApplications.length },
  ]

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
                <h1 className="font-display text-3xl font-bold text-slate-800">Staff Leave</h1>
                <p className="text-slate-500 text-sm">Manage your leave applications</p>
              </div>
            </div>
            {canApply && (
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Apply Leave
              </button>
            )}
          </div>
        </div>

        {/* Leave Balance */}
        <div className="mb-6">
          <LeaveBalanceCard casual={balance.casual} medical={balance.medical} />
        </div>

        {/* Tabs */}
        <div className="glass rounded-2xl p-2 mb-6">
          <div className="flex gap-1.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
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
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            ) : (
              <>
                {/* Active Applications Tab */}
                {activeTab === 'active' && (
                  activeApplications.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <CalendarDays size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm mb-3">No active leave applications</p>
                      <button
                        onClick={() => setShowNewForm(true)}
                        className="text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium"
                      >
                        Apply for leave
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {activeApplications.map(app => (
                        <motion.div key={app.id} variants={itemVariants}>
                          <LeaveApplicationCard
                            application={app}
                            currentUserId={user.id}
                            currentUserRole={profile.role}
                            onStatusChange={loadData}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                )}

                {/* Pending Approvals Tab */}
                {activeTab === 'pending' && (
                  pendingApprovals.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <CheckCircle size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No pending approvals</p>
                    </div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {pendingApprovals.map(app => (
                        <motion.div key={app.id} variants={itemVariants}>
                          <LeaveApplicationCard
                            application={app}
                            currentUserId={user.id}
                            currentUserRole={profile.role}
                            isApprover={true}
                            onStatusChange={loadData}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  pastApplications.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <History size={36} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No leave history yet</p>
                    </div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {pastApplications.map(app => (
                        <motion.div key={app.id} variants={itemVariants}>
                          <LeaveApplicationCard
                            application={app}
                            currentUserId={user.id}
                            currentUserRole={profile.role}
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
        <LeaveApplicationForm
          isOpen={showNewForm}
          onClose={() => setShowNewForm(false)}
          onCreated={loadData}
          userId={user.id}
          userRole={profile.role}
        />
      </div>
    </ProtectedLayout>
  )
}
