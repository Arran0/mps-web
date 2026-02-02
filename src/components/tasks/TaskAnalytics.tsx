'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { fetchAnalyticsData, TaskStatus, STATUS_LABELS } from '@/lib/tasks'

interface TaskAnalyticsProps {
  userId: string
  viewingUserId?: string
}

// Custom SVG Pie Chart
function PieChart({ data }: { data: Record<TaskStatus, number> }) {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-56 h-56 mx-auto">
        <div className="text-center">
          <div className="w-40 h-40 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center mx-auto">
            <p className="text-sm text-slate-400">No data</p>
          </div>
        </div>
      </div>
    )
  }

  const colors: Record<TaskStatus, string> = {
    not_done: '#ef4444',
    partial: '#f59e0b',
    done: '#22c55e',
    checked: '#3b82f6',
  }

  const segments: { status: TaskStatus; pct: number; color: string; startAngle: number; endAngle: number }[] = []
  let currentAngle = -90 // Start from top

  const statuses: TaskStatus[] = ['not_done', 'partial', 'done', 'checked']
  statuses.forEach(status => {
    const value = data[status]
    if (value === 0) return
    const pct = value / total
    const angle = pct * 360
    segments.push({
      status,
      pct,
      color: colors[status],
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    })
    currentAngle += angle
  })

  const r = 90
  const cx = 100
  const cy = 100

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {segments.map((seg, i) => {
          const start = polarToCartesian(seg.startAngle)
          const end = polarToCartesian(seg.endAngle)
          const largeArc = seg.endAngle - seg.startAngle > 180 ? 1 : 0

          if (segments.length === 1) {
            // Full circle
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill={seg.color} />
            )
          }

          return (
            <path
              key={i}
              d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
              fill={seg.color}
              stroke="white"
              strokeWidth="2"
            />
          )
        })}
        {/* Center white circle for donut effect */}
        <circle cx={cx} cy={cy} r={50} fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1e293b">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#94a3b8">
          Total Tasks
        </text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
        {statuses.map(status => (
          <div key={status} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[status] }} />
            <span className="text-sm text-slate-600">
              {STATUS_LABELS[status]}: <span className="font-semibold">{data[status]}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TaskAnalytics({ userId, viewingUserId }: TaskAnalyticsProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [data, setData] = useState<Record<TaskStatus, number>>({ not_done: 0, partial: 0, done: 0, checked: 0 })
  const [loading, setLoading] = useState(true)

  const targetUserId = viewingUserId || userId

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await fetchAnalyticsData(targetUserId, period)
    setData(result)
    setLoading(false)
  }, [targetUserId, period])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800">Analytics</h2>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-white text-mps-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading analytics...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-8"
        >
          <PieChart data={data} />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {Object.values(data).reduce((s, v) => s + v, 0) > 0
                  ? Math.round((data.checked / Object.values(data).reduce((s, v) => s + v, 0)) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-green-600 font-medium">Completion Rate</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{data.not_done}</p>
              <p className="text-xs text-red-600 font-medium">Pending Tasks</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{data.partial}</p>
              <p className="text-xs text-amber-600 font-medium">In Progress</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{data.checked}</p>
              <p className="text-xs text-blue-600 font-medium">Verified</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
