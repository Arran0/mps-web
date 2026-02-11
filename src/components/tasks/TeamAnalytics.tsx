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
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-slate-800">Team Analytics</h2>
      <p className="text-sm text-slate-500">Monthly report for {currentMonth}</p>

      {loading ? (
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading team analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-700">{teamCompletionRate}%</p>
              <p className="text-xs text-slate-500">Completion Rate</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Star size={16} className="text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-700">{totalBonus}</p>
              <p className="text-xs text-slate-500">Bonus Points</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-700">{totalCompleted}</p>
              <p className="text-xs text-slate-500">Tasks Completed</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-700">{totalOverdue}</p>
              <p className="text-xs text-slate-500">Overdue Tasks</p>
            </div>
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
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    index === 0 ? 'bg-amber-50 border border-amber-200' :
                    index === 1 ? 'bg-slate-50 border border-slate-200' :
                    index === 2 ? 'bg-orange-50 border border-orange-200' :
                    'bg-white border border-slate-100'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-400 text-white' :
                    index === 1 ? 'bg-slate-400 text-white' :
                    index === 2 ? 'bg-orange-400 text-white' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{m.user.full_name?.charAt(0) || '?'}</span>
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{m.user.full_name}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      {leaderboardBasis === 'completed' ? m.stats.completed : m.stats.bonus}
                    </p>
                    <p className="text-xs text-slate-400">
                      {leaderboardBasis === 'completed' ? 'completed' : 'points'}
                    </p>
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
