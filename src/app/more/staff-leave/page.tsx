'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react'

// Demo leave data
const leaveHistory = [
  { id: 1, type: 'Casual Leave', from: '2024-01-15', to: '2024-01-15', days: 1, status: 'approved', reason: 'Personal work' },
  { id: 2, type: 'Medical Leave', from: '2024-01-08', to: '2024-01-10', days: 3, status: 'approved', reason: 'Medical appointment' },
  { id: 3, type: 'Casual Leave', from: '2024-01-20', to: '2024-01-21', days: 2, status: 'pending', reason: 'Family function' },
  { id: 4, type: 'Earned Leave', from: '2023-12-25', to: '2023-12-31', days: 5, status: 'rejected', reason: 'Year end vacation' },
]

const leaveBalance = [
  { type: 'Casual Leave', total: 12, used: 4, remaining: 8, color: 'bg-mps-blue-500' },
  { type: 'Medical Leave', total: 10, used: 3, remaining: 7, color: 'bg-emerald-500' },
  { type: 'Earned Leave', total: 15, used: 5, remaining: 10, color: 'bg-purple-500' },
]

const statusConfig = {
  approved: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle2 size={16} /> },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock size={16} /> },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', icon: <XCircle size={16} /> },
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

export default function StaffLeavePage() {
  return (
    <ProtectedLayout staffOnly>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl shadow-lg">
                  <CalendarDays className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold text-slate-800">Staff Leave Manager</h1>
                  <p className="text-slate-500 text-sm">Apply and track your leave requests</p>
                </div>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                <span className="hidden sm:inline">Apply Leave</span>
              </button>
            </div>
          </motion.div>

          {/* Under Construction Notice */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <p className="text-amber-700 text-sm">
                <span className="font-medium">Under Construction:</span> Full leave management features coming soon. Currently showing demo content.
              </p>
            </div>
          </motion.div>

          {/* Leave Balance Cards */}
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="font-semibold text-slate-800 mb-4">Leave Balance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {leaveBalance.map((leave, index) => (
                <div key={leave.type} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-700">{leave.type}</h3>
                    <Calendar className="text-slate-400" size={18} />
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold text-slate-800">{leave.remaining}</span>
                    <span className="text-slate-500 text-sm">/ {leave.total} days</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${leave.color} rounded-full transition-all`}
                      style={{ width: `${(leave.remaining / leave.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{leave.used} days used</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Leave History */}
          <motion.div variants={itemVariants}>
            <h2 className="font-semibold text-slate-800 mb-4">Leave History</h2>
            <div className="glass rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {leaveHistory.map((leave, index) => {
                  const status = statusConfig[leave.status as keyof typeof statusConfig]
                  return (
                    <motion.div
                      key={leave.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-5 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-slate-800">{leave.type}</h4>
                            <span className={`text-xs px-2 py-1 ${status.bg} ${status.text} rounded-full font-medium flex items-center gap-1 capitalize`}>
                              {status.icon}
                              {leave.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mb-1">{leave.reason}</p>
                          <p className="text-xs text-slate-400">
                            {leave.from} to {leave.to} ({leave.days} {leave.days === 1 ? 'day' : 'days'})
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
