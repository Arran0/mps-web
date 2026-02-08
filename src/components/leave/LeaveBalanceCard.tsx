'use client'

import React from 'react'
import { Calendar, Briefcase, Heart } from 'lucide-react'

interface LeaveBalanceCardProps {
  casual: { used: number; total: number }
  medical: { used: number; total: number }
}

export default function LeaveBalanceCard({ casual, medical }: LeaveBalanceCardProps) {
  const casualRemaining = casual.total - casual.used
  const medicalRemaining = medical.total - medical.used

  const casualPercent = (casual.used / casual.total) * 100
  const medicalPercent = (medical.used / medical.total) * 100

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={20} className="text-mps-blue-600" />
        <h3 className="font-bold text-slate-800">Leave Balance</h3>
        <span className="text-xs text-slate-500 ml-auto">{new Date().getFullYear()}</span>
      </div>

      <div className="space-y-4">
        {/* Casual Leave */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-blue-600" />
              <span className="font-medium text-slate-700">Casual Leave (CL)</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-800">{casualRemaining}</span>
              <span className="text-slate-500"> / {casual.total} days</span>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                casualPercent > 80 ? 'bg-red-500' : casualPercent > 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${casualPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {casual.used} day{casual.used !== 1 ? 's' : ''} used
          </p>
        </div>

        {/* Medical Leave */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-purple-600" />
              <span className="font-medium text-slate-700">Medical Leave</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-800">{medicalRemaining}</span>
              <span className="text-slate-500"> / {medical.total} days</span>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                medicalPercent > 80 ? 'bg-red-500' : medicalPercent > 50 ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${medicalPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {medical.used} day{medical.used !== 1 ? 's' : ''} used
          </p>
        </div>
      </div>
    </div>
  )
}
