'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Star, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react'
import { fetchTeamAnalytics } from '@/lib/tasks'
import { UserProfile, UserRole } from '@/lib/supabase'

interface TeamAnalyticsProps {
  userId: string
  userRole: UserRole
}

interface MemberStats {
  user: UserProfile
  stats: {
    completed: number
    bonus: number
    overdue: number
    total: number
    completionRate: number
  }
}

export default function TeamAnalytics({ userId, userRole }: TeamAnalyticsProps) {
  const [members, setMembers] = useState<MemberStats[]>([])
  const [loading, setLoading] = useState(true)
  const [leaderboardBasis, setLeaderboardBasis] = useState<'completed' | 'bonus'>('completed')

  const [teamCompletionRate, setTeamCompletionRate] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await fetchTeamAnalytics(userId, userRole)
    setMembers(data.members)
    setTeamCompletionRate(data.teamCompletionRate)
    setLoading(false)
  }, [userId, userRole])

  useEffect(() => { loadData() }, [loadData])

  // Leaderboard sorting
  const leaderboard = [...members]
    .sort((a, b) => {
      if (leaderboardBasis === 'completed') return b.stats.completed - a.stats.completed
      return b.stats.bonus - a.stats.bonus
    })
    .slice(0, userRole === 'principal' || userRole === 'admin' ? 10 : members.length)

  // Aggregate stats
  const totalCompleted = members.reduce((s, m) => s + m.stats.completed, 0)
  const totalBonus = members.reduce((s, m) => s + m.stats.bonus, 0)
  const totalTasks = members.reduce((s, m) => s + m.stats.total, 0)
  const totalOverdue = members.reduce((s, m) => s + m.stats.overdue, 0)
  // Use team-wide completion rate (all checked / all total)

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Monthly report · {currentMonth}</p>

      {loading ? (
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading team analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { icon: <TrendingUp size={15} className="text-white" />, gradient: 'from-green-400 to-emerald-500', value: `${teamCompletionRate}%`, label: 'Completion Rate' },
              { icon: <Star size={15} className="text-white" />, gradient: 'from-amber-400 to-orange-500', value: totalBonus, label: 'Bonus Points' },
              { icon: <CheckCircle2 size={15} className="text-white" />, gradient: 'from-mps-blue-400 to-mps-blue-600', value: totalCompleted, label: 'Tasks Completed' },
              { icon: <AlertTriangle size={15} className="text-white" />, gradient: 'from-red-400 to-rose-500', value: totalOverdue, label: 'Overdue' },
            ] as const).map((stat, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2.5`}>
                  {stat.icon}
                </div>
                <p className="text-xl font-bold text-slate-800 leading-none mb-1">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Member Stats Table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <BarChart3 size={16} className="text-mps-blue-600" />
              <h3 className="font-semibold text-slate-700">Member Statistics</h3>
              <span className="text-xs text-slate-400">({members.length} members)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left p-3 text-slate-500 font-medium">Name</th>
                    <th className="text-center p-3 text-slate-500 font-medium">Total</th>
                    <th className="text-center p-3 text-slate-500 font-medium">Completed</th>
                    <th className="text-center p-3 text-slate-500 font-medium">Bonus</th>
                    <th className="text-center p-3 text-slate-500 font-medium">Overdue</th>
                    <th className="text-center p-3 text-slate-500 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.user.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{m.user.full_name?.charAt(0) || '?'}</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{m.user.full_name}</p>
                            <p className="text-xs text-slate-400">{m.user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center p-3 text-slate-600">{m.stats.total}</td>
                      <td className="text-center p-3">
                        <span className="text-green-600 font-medium">{m.stats.completed}</span>
                      </td>
                      <td className="text-center p-3">
                        <span className="text-amber-600 font-medium">{m.stats.bonus}</span>
                      </td>
                      <td className="text-center p-3">
                        <span className={`font-medium ${m.stats.overdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {m.stats.overdue}
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-mps-blue-500 to-mps-green-500 rounded-full"
                              style={{ width: `${m.stats.completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{m.stats.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <h3 className="font-semibold text-slate-700">
                  Leaderboard
                  {(userRole === 'principal' || userRole === 'admin') && ' (Top 10)'}
                </h3>
              </div>
              <select
                value={leaderboardBasis}
                onChange={e => setLeaderboardBasis(e.target.value as 'completed' | 'bonus')}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
              >
                <option value="completed">Completed Tasks</option>
                <option value="bonus">Bonus Points</option>
              </select>
            </div>

            <div className="space-y-2">
              {leaderboard.map((m, index) => (
                <motion.div
                  key={m.user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200' :
                    index === 1 ? 'bg-slate-50 border border-slate-200' :
                    index === 2 ? 'bg-orange-50 border border-orange-200' :
                    'bg-white border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {/* Rank medal */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{m.user.full_name?.charAt(0) || '?'}</span>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{m.user.full_name}</p>
                    <p className="text-[10px] text-slate-400">{m.user.role}</p>
                  </div>

                  {/* Score */}
                  <div className={`text-right flex-shrink-0 ${index < 3 ? 'font-bold text-base' : 'font-semibold text-sm'} ${
                    index === 0 ? 'text-amber-600' : index === 1 ? 'text-slate-500' : index === 2 ? 'text-orange-500' : 'text-slate-600'
                  }`}>
                    {leaderboardBasis === 'completed' ? m.stats.completed : m.stats.bonus}
                  </div>
                </motion.div>
              ))}

              {leaderboard.length === 0 && (
                <div className="text-center py-8">
                  <Trophy size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No team data available yet</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
