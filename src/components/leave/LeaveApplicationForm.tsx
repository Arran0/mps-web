'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  FileText,
  AlertCircle,
  Send,
} from 'lucide-react'
import {
  createLeaveApplication,
  fetchCoordinators,
  fetchPrincipals,
  fetchAdmins,
  LeaveType,
  LEAVE_TYPE_LABELS,
  NewLeaveInput,
} from '@/lib/leave'
import { UserRole } from '@/lib/supabase'

interface LeaveApplicationFormProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  userId: string
  userRole: UserRole
}

export default function LeaveApplicationForm({
  isOpen,
  onClose,
  onCreated,
  userId,
  userRole,
}: LeaveApplicationFormProps) {
  const [leaveType, setLeaveType] = useState<LeaveType>('casual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableApprovers, setAvailableApprovers] = useState<{ id: string; full_name: string; email: string }[]>([])
  const [selectedApproverIds, setSelectedApproverIds] = useState<string[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!isOpen) return
    const loadApprovers = async () => {
      if (userRole === 'teacher') {
        const coordinators = await fetchCoordinators()
        setAvailableApprovers(coordinators)
      } else if (userRole === 'coordinator') {
        const principals = await fetchPrincipals()
        setAvailableApprovers(principals)
      } else if (userRole === 'principal') {
        const admins = await fetchAdmins()
        setAvailableApprovers(admins)
      }
    }
    loadApprovers()
  }, [isOpen, userRole])

  const resetForm = () => {
    setLeaveType('casual')
    setStartDate('')
    setEndDate('')
    setReason('')
    setError(null)
    setSelectedApproverIds([])
  }

  const canSubmit = () => {
    if (!startDate || !endDate || !reason.trim()) return false
    if (new Date(endDate) < new Date(startDate)) return false
    if (selectedApproverIds.length === 0 && availableApprovers.length > 0) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) return

    setSubmitting(true)
    setError(null)

    const input: NewLeaveInput = {
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
    }

    const result = await createLeaveApplication(input, userId, userRole, selectedApproverIds)

    if (!result) {
      setError('Failed to submit leave application. Please try again.')
      setSubmitting(false)
      return
    }

    resetForm()
    onCreated()
    onClose()
    setSubmitting(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-mps-blue-600" />
                New Leave Application
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Leave Type */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {(['casual', 'medical'] as LeaveType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLeaveType(type)}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        leaveType === type
                          ? 'bg-mps-blue-500 text-white shadow-lg'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {LEAVE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    min={today}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate || today}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Duration display */}
              {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
                <div className="text-sm text-mps-blue-600 bg-mps-blue-50 px-3 py-2 rounded-lg">
                  Duration: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <FileText size={14} /> Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Please provide a reason for your leave..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 resize-none"
                  required
                />
              </div>

              {/* Approver Selection - Teachers */}
              {userRole === 'teacher' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Select Coordinator(s) to Approve <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-3">
                    {availableApprovers.length === 0 ? (
                      <p className="text-sm text-slate-500">No coordinators available</p>
                    ) : (
                      availableApprovers.map(c => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedApproverIds.includes(c.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedApproverIds(prev => [...prev, c.id])
                              } else {
                                setSelectedApproverIds(prev => prev.filter(id => id !== c.id))
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{c.full_name} ({c.email})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Approver Selection - Coordinators */}
              {userRole === 'coordinator' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Select Principal(s) to Approve <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-3">
                    {availableApprovers.length === 0 ? (
                      <p className="text-sm text-slate-500">No principals available</p>
                    ) : (
                      availableApprovers.map(p => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedApproverIds.includes(p.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedApproverIds(prev => [...prev, p.id])
                              } else {
                                setSelectedApproverIds(prev => prev.filter(id => id !== p.id))
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{p.full_name} ({p.email})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {userRole === 'principal' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Select Approving Admin(s) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-3">
                    {availableApprovers.map(a => (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedApproverIds.includes(a.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedApproverIds(prev => [...prev, a.id])
                            } else {
                              setSelectedApproverIds(prev => prev.filter(id => id !== a.id))
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">{a.full_name} ({a.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Info */}
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                {userRole === 'teacher' && (
                  <span>Your application will be sent to the selected coordinator(s) for review and approval.</span>
                )}
                {userRole === 'coordinator' && (
                  <span>Your application will be sent to the selected principal(s) for review and approval.</span>
                )}
                {userRole === 'principal' && (
                  <span>Your application will be sent to the selected admin(s) for review and approval.</span>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !canSubmit()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
