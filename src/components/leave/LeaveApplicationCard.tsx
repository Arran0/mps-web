'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  ExternalLink,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import {
  LeaveApplicationWithDetails,
  LeaveApproval,
  processLeaveApproval,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_COLORS,
} from '@/lib/leave'

interface LeaveApplicationCardProps {
  application: LeaveApplicationWithDetails
  currentUserId: string
  currentUserRole: string
  isApprover?: boolean
  onStatusChange?: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export default function LeaveApplicationCard({
  application,
  currentUserId,
  currentUserRole,
  isApprover = false,
  onStatusChange,
}: LeaveApplicationCardProps) {
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<LeaveApproval | null>(null)
  const [comments, setComments] = useState('')
  const [processing, setProcessing] = useState(false)

  const days = calculateDays(application.start_date, application.end_date)
  const isPending = application.status === 'pending'

  // Find approvals that current user can act on
  // Match by explicit approver_id (for student→teacher/coordinator/principal leaves)
  // OR by role (for legacy staff leave with no explicit approver_id)
  const myPendingApprovals = application.approvals.filter(a => {
    if (a.status !== 'pending') return false
    if (a.approver_id === currentUserId) return true
    if (currentUserRole === 'coordinator' && a.approver_role === 'coordinator' && !a.approver_id) return true
    if (currentUserRole === 'principal'   && a.approver_role === 'principal'   && !a.approver_id) return true
    if (currentUserRole === 'admin'       && a.approver_role === 'admin'       && !a.approver_id) return true
    return false
  })

  const handleApprovalClick = (approval: LeaveApproval) => {
    setSelectedApproval(approval)
    setComments('')
    setShowApprovalModal(true)
  }

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedApproval) return
    setProcessing(true)

    const success = await processLeaveApproval(
      selectedApproval.id,
      currentUserId,
      decision,
      comments
    )

    setProcessing(false)
    setShowApprovalModal(false)
    setSelectedApproval(null)

    if (success && onStatusChange) {
      onStatusChange()
    }
  }

  return (
    <>
      <div className="glass rounded-2xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              application.leave_type === 'casual' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              <Calendar size={18} className={
                application.leave_type === 'casual' ? 'text-blue-600' : 'text-purple-600'
              } />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                {LEAVE_TYPE_LABELS[application.leave_type]}
              </h3>
              <p className="text-xs text-slate-500">
                {formatRelativeDate(application.created_at)}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${LEAVE_STATUS_COLORS[application.status]}`}>
            {LEAVE_STATUS_LABELS[application.status]}
          </span>
        </div>

        {/* Applicant Info (for approvers) */}
        {isApprover && application.applicant && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
            <User size={14} />
            <span className="font-medium">{application.applicant.full_name}</span>
            <span className="text-slate-400">({application.applicant.role})</span>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar size={14} />
            <span>{formatDate(application.start_date)}</span>
            <span className="text-slate-400">to</span>
            <span>{formatDate(application.end_date)}</span>
          </div>
          <span className="px-2 py-0.5 bg-mps-blue-50 text-mps-blue-700 rounded-full text-xs font-medium">
            {days} day{days > 1 ? 's' : ''}
          </span>
        </div>

        {/* Reason */}
        <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
          <p className="font-medium text-slate-700 text-xs mb-1">Reason:</p>
          <p>{application.reason}</p>
        </div>

        {/* Approval Status */}
        {application.approvals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Approval Status:</p>
            <div className="space-y-1.5">
              {application.approvals.map(approval => (
                <div
                  key={approval.id}
                  className={`text-xs px-3 py-2 rounded-lg ${
                    approval.status === 'approved' ? 'bg-green-50' :
                    approval.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {approval.status === 'approved' && <CheckCircle size={12} className="text-green-600" />}
                      {approval.status === 'rejected' && <XCircle size={12} className="text-red-600" />}
                      {approval.status === 'pending' && <Clock size={12} className="text-amber-600" />}
                      <span className="font-medium capitalize">
                        {approval.approver?.full_name
                          ? approval.approver.full_name
                          : approval.approver_role}
                      </span>
                      {approval.team && <span className="text-slate-500">({approval.team.name})</span>}
                    </div>
                    <span className={`font-medium ${
                      approval.status === 'approved' ? 'text-green-700' :
                      approval.status === 'rejected' ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      {LEAVE_STATUS_LABELS[approval.status]}
                    </span>
                  </div>
                  {approval.comments && (
                    <p className={`mt-1 pl-5 italic leading-snug ${
                      approval.status === 'rejected' ? 'text-red-700' : 'text-slate-600'
                    }`}>
                      "{approval.comments}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons for Approvers */}
        {isApprover && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {/* View Calendar Button - Always show for approvers */}
            {application.applicant_id && (
              <a
                href={`/tasks?date=${application.start_date}&user=${application.applicant_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-secondary text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} />
                View Applicant's Weekly Calendar
              </a>
            )}

            {/* Review Buttons - Only for pending approvals */}
            {myPendingApprovals.length > 0 && myPendingApprovals.map(approval => (
              <button
                key={approval.id}
                onClick={() => handleApprovalClick(approval)}
                className="w-full btn-primary text-sm flex items-center justify-center gap-2"
              >
                Review & Decide
                {approval.team && <span className="text-xs opacity-75">({approval.team.name})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Approval Decision Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showApprovalModal && selectedApproval && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowApprovalModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Review Leave Application
                </h3>

                <div className="space-y-3 mb-4">
                  <div className="text-sm">
                    <span className="text-slate-500">Applicant:</span>{' '}
                    <span className="font-medium">{application.applicant?.full_name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Type:</span>{' '}
                    <span className="font-medium">{LEAVE_TYPE_LABELS[application.leave_type]}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Duration:</span>{' '}
                    <span className="font-medium">{days} day{days > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <MessageSquare size={14} /> Comments (Optional)
                  </label>
                  <textarea
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Add any comments..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision('rejected')}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 bg-red-100 text-red-700 rounded-xl font-medium text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => handleDecision('approved')}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
