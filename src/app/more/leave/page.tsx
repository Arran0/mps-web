'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  CalendarDays, Plus, Clock, History, Search, X, User, Database,
} from 'lucide-react'
import LeaveApplicationCard from '@/components/leave/LeaveApplicationCard'
import LeaveBalanceCard from '@/components/leave/LeaveBalanceCard'
import {
  LeaveApplicationWithDetails,
  LEAVE_TYPE_LABELS,
  fetchMyLeaveApplications,
  fetchLeaveBalance,
  fetchAllLeaveApplications,
  searchLeaveRecipients,
  createStudentLeaveApplication,
  RecipientProfile,
} from '@/lib/leave'

type TabId = 'active' | 'history'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Teacher', coordinator: 'Coordinator', principal: 'Principal',
}
const ROLE_COLOR: Record<string, string> = {
  teacher: 'text-blue-600 bg-blue-50',
  coordinator: 'text-purple-600 bg-purple-50',
  principal: 'text-amber-700 bg-amber-50',
}

export default function StudentLeavePage() {
  const { user, profile } = useAuth()

  const isAdmin = profile?.role === 'admin'

  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Student's own applications
  const [applications, setApplications] = useState<LeaveApplicationWithDetails[]>([])
  const [balance, setBalance] = useState({ casual: { used: 0, total: 12 }, medical: { used: 0, total: 15 } })

  // Admin: all student applications
  const [allStudentApps, setAllStudentApps] = useState<LeaveApplicationWithDetails[]>([])

  // Recipient search
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientResults, setRecipientResults] = useState<RecipientProfile[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientProfile | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Form fields
  const [leaveType, setLeaveType] = useState<'casual' | 'medical'>('casual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    if (isAdmin) {
      const allApps = await fetchAllLeaveApplications()
      setAllStudentApps(allApps.filter(app => app.applicant?.role === 'student'))
    } else {
      const [apps, bal] = await Promise.all([
        fetchMyLeaveApplications(user.id),
        fetchLeaveBalance(user.id),
      ])
      setApplications(apps)
      setBalance(bal)
    }
    setLoading(false)
  }, [user, profile, isAdmin])

  useEffect(() => { loadData() }, [loadData])

  // Debounced recipient search
  useEffect(() => {
    if (selectedRecipient) { setRecipientResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (recipientQuery.trim().length < 2) { setRecipientResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      const results = await searchLeaveRecipients(recipientQuery)
      setRecipientResults(results)
      setSearchLoading(false)
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [recipientQuery, selectedRecipient])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setRecipientResults([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelectRecipient = (r: RecipientProfile) => {
    setSelectedRecipient(r)
    setRecipientQuery(r.email)
    setRecipientResults([])
  }

  const resetForm = () => {
    setSelectedRecipient(null)
    setRecipientQuery('')
    setRecipientResults([])
    setLeaveType('casual')
    setStartDate('')
    setEndDate('')
    setReason('')
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedRecipient) { setFormError('Please select a recipient.'); return }
    if (!startDate || !endDate) { setFormError('Please select start and end dates.'); return }
    if (endDate < startDate) { setFormError('End date must be on or after start date.'); return }
    if (!reason.trim()) { setFormError('Please provide a reason.'); return }

    setSubmitting(true)
    setFormError('')
    const result = await createStudentLeaveApplication(
      { leave_type: leaveType, start_date: startDate, end_date: endDate, reason: reason.trim() },
      user.id, selectedRecipient.id, selectedRecipient.role,
    )
    setSubmitting(false)

    if (result) {
      resetForm()
      setShowForm(false)
      await loadData()
      setActiveTab('active')
    } else {
      setFormError('Failed to submit. Please try again.')
    }
  }

  if (!user || !profile) return null

  const activeApps = applications.filter(a => a.status === 'pending')
  const historyApps = applications.filter(a => a.status !== 'pending')
  const activeStudentApps = allStudentApps.filter(a => a.status === 'pending')
  const historyStudentApps = allStudentApps.filter(a => a.status !== 'pending')
  const today = new Date().toISOString().split('T')[0]

  // ── ADMIN VIEW ──────────────────────────────────────────────
  if (isAdmin) {
    return (
      <ProtectedLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl shadow-lg">
              <CalendarDays className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800">Student Leave Applications</h1>
              <p className="text-slate-500 text-sm">All student leave requests across the school</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="glass rounded-2xl p-1.5 mb-5 flex gap-1">
            {([
              { id: 'active' as TabId, label: 'Active', Icon: Clock, count: activeStudentApps.length },
              { id: 'history' as TabId, label: 'History', Icon: History, count: historyStudentApps.length },
            ]).map(({ id, label, Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === id
                    ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} />
                {label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === id ? 'bg-white/25' : 'bg-slate-200 text-slate-600'
                  }`}>{count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="spinner mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Loading…</p>
                </div>
              ) : (() => {
                const list = activeTab === 'active' ? activeStudentApps : historyStudentApps
                return list.length === 0 ? (
                  <div className="glass rounded-2xl p-10 text-center">
                    <Database size={36} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">
                      {activeTab === 'active' ? 'No active student leave applications' : 'No past student leave applications'}
                    </p>
                  </div>
                ) : (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                    {list.map(app => (
                      <motion.div key={app.id} variants={itemVariants}>
                        <LeaveApplicationCard
                          application={app}
                          currentUserId={user.id}
                          currentUserRole={profile.role}
                          isApprover={false}
                          onStatusChange={loadData}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )
              })()}
            </motion.div>
          </AnimatePresence>

        </div>
      </ProtectedLayout>
    )
  }

  // ── STUDENT / STAFF VIEW ────────────────────────────────────
  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl shadow-lg">
              <CalendarDays className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800">Leave</h1>
              <p className="text-slate-500 text-sm">Apply and track your leave requests</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(v => !v) }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Apply Leave</span>
            <span className="sm:hidden">Apply</span>
          </button>
        </div>

        {/* Leave Balance */}
        <div className="mb-5">
          <LeaveBalanceCard casual={balance.casual} medical={balance.medical} />
        </div>

        {/* Application Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">New Leave Application</h2>
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    className="p-1 text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>

                {/* Recipient search */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Send To <span className="text-slate-400 font-normal">(Teacher / Coordinator / Principal)</span>
                  </label>
                  <div ref={searchRef} className="relative">
                    <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                      selectedRecipient
                        ? 'border-mps-blue-300'
                        : 'border-slate-200 focus-within:border-mps-blue-400 focus-within:ring-2 focus-within:ring-mps-blue-400/20'
                    }`}>
                      {selectedRecipient
                        ? <User size={14} className="text-mps-blue-500 flex-shrink-0" />
                        : <Search size={14} className="text-slate-400 flex-shrink-0" />
                      }
                      <input
                        type="text"
                        value={recipientQuery}
                        onChange={e => {
                          setRecipientQuery(e.target.value)
                          if (selectedRecipient) setSelectedRecipient(null)
                        }}
                        placeholder="Type email or name…"
                        className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
                        autoComplete="off"
                      />
                      {searchLoading && (
                        <div className="w-3.5 h-3.5 border-2 border-mps-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                      {selectedRecipient && (
                        <button type="button" onClick={() => { setSelectedRecipient(null); setRecipientQuery('') }}
                          className="flex-shrink-0 text-slate-400 hover:text-slate-600">
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Selected badge */}
                    {selectedRecipient && (
                      <div className="mt-1.5 flex items-center gap-2 px-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[selectedRecipient.role] ?? 'text-slate-600 bg-slate-100'}`}>
                          {ROLE_LABEL[selectedRecipient.role] ?? selectedRecipient.role}
                        </span>
                        <span className="text-xs text-slate-700 font-medium">{selectedRecipient.full_name}</span>
                      </div>
                    )}

                    {/* Suggestions dropdown */}
                    <AnimatePresence>
                      {recipientResults.length > 0 && !selectedRecipient && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden"
                        >
                          {recipientResults.map(r => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleSelectRecipient(r)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {r.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{r.full_name}</p>
                                <p className="text-xs text-slate-500 truncate">{r.email}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLOR[r.role] ?? 'text-slate-600 bg-slate-100'}`}>
                                {ROLE_LABEL[r.role] ?? r.role}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Leave type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Leave Type</label>
                  <div className="flex gap-2">
                    {(['casual', 'medical'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setLeaveType(t)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          leaveType === t
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {LEAVE_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">From</label>
                    <input
                      type="date" value={startDate} min={today}
                      onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(e.target.value) }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">To</label>
                    <input
                      type="date" value={endDate} min={startDate || today}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Briefly describe your reason for leave…"
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40 resize-none"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
                )}

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedRecipient}
                    className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="glass rounded-2xl p-1.5 mb-5 flex gap-1">
          {([
            { id: 'active' as TabId, label: 'Active', Icon: Clock, count: activeApps.length },
            { id: 'history' as TabId, label: 'History', Icon: History, count: historyApps.length },
          ]).map(({ id, label, Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === id
                  ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === id ? 'bg-white/25' : 'bg-slate-200 text-slate-600'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {loading ? (
              <div className="text-center py-12">
                <div className="spinner mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading…</p>
              </div>
            ) : activeTab === 'active' ? (
              activeApps.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                  <CalendarDays size={36} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm mb-3">No active applications</p>
                  <button onClick={() => { resetForm(); setShowForm(true) }}
                    className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                    Apply for leave
                  </button>
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                  {activeApps.map(app => (
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
            ) : (
              historyApps.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                  <History size={36} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No leave history yet</p>
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                  {historyApps.map(app => (
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
          </motion.div>
        </AnimatePresence>

      </div>
    </ProtectedLayout>
  )
}
