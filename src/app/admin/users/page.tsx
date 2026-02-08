'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Edit3,
  Check,
  X,
  User,
  GraduationCap,
  Briefcase,
  Shield,
  Crown,
  Settings,
  AlertCircle,
} from 'lucide-react'
import {
  ProfileWithTeams,
  fetchAllProfiles,
  updateProfile,
  updateTeamMemberships,
  fetchAllTeams,
  ROLE_COLORS,
} from '@/lib/admin'
import { UserRole, getRoleDisplayName } from '@/lib/supabase'

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  student: <GraduationCap size={14} />,
  teacher: <Briefcase size={14} />,
  coordinator: <Shield size={14} />,
  principal: <Crown size={14} />,
  admin: <Settings size={14} />,
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']
const ROLES: UserRole[] = ['student', 'teacher', 'coordinator', 'principal', 'admin']

export default function AdminUsersPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ProfileWithTeams[]>([])
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')

  // Edit modal state
  const [editingUser, setEditingUser] = useState<ProfileWithTeams | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('student')
  const [editGrade, setEditGrade] = useState<number | undefined>()
  const [editSection, setEditSection] = useState<string | undefined>()
  const [editTeamIds, setEditTeamIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check admin access
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/home')
    }
  }, [profile, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [profilesData, teamsData] = await Promise.all([
      fetchAllProfiles(),
      fetchAllTeams(),
    ])
    setProfiles(profilesData)
    setAllTeams(teamsData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter profiles
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || p.role === filterRole
    return matchesSearch && matchesRole
  })

  // Group by role
  const groupedProfiles = ROLES.reduce((acc, role) => {
    acc[role] = filteredProfiles.filter(p => p.role === role)
    return acc
  }, {} as Record<UserRole, ProfileWithTeams[]>)

  const openEditModal = (user: ProfileWithTeams) => {
    setEditingUser(user)
    setEditFullName(user.full_name)
    setEditRole(user.role)
    setEditGrade(user.grade || undefined)
    setEditSection(user.section || undefined)
    setEditTeamIds(user.teams.map(t => t.id))
    setError(null)
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    setError(null)

    // Update profile
    const profileUpdated = await updateProfile(editingUser.id, {
      full_name: editFullName,
      role: editRole,
      grade: editRole === 'student' ? editGrade : undefined,
      section: editRole === 'student' ? editSection : undefined,
    })

    if (!profileUpdated) {
      setError('Failed to update profile')
      setSaving(false)
      return
    }

    // Update team memberships (for non-students)
    if (editRole !== 'student') {
      const teamsUpdated = await updateTeamMemberships(editingUser.id, editTeamIds)
      if (!teamsUpdated) {
        setError('Failed to update team memberships')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setEditingUser(null)
    loadData()
  }

  const toggleTeam = (teamId: string) => {
    setEditTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
  }

  if (!user || !profile || profile.role !== 'admin') {
    return null
  }

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl shadow-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800">User Management</h1>
              <p className="text-slate-500 text-sm">Manage all user profiles and team assignments</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value as UserRole | 'all')}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
            >
              <option value="all">All Roles</option>
              {ROLES.map(role => (
                <option key={role} value={role}>{getRoleDisplayName(role)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* User List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {ROLES.map(role => {
              const users = groupedProfiles[role]
              if (users.length === 0) return null

              return (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${ROLE_COLORS[role]}`}>
                      {ROLE_ICONS[role]}
                      {getRoleDisplayName(role)}
                    </span>
                    <span className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="glass rounded-2xl divide-y divide-slate-100">
                    {users.map(user => (
                      <div
                        key={user.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-mps-blue-400 to-mps-green-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{user.full_name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Student info */}
                          {user.role === 'student' && user.grade && (
                            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg font-medium">
                              Grade {user.grade}{user.section ? ` - ${user.section}` : ''}
                            </span>
                          )}

                          {/* Team badges */}
                          {user.teams.length > 0 && (
                            <div className="flex gap-1">
                              {user.teams.slice(0, 2).map(team => (
                                <span key={team.id} className="text-xs px-2 py-1 bg-mps-blue-50 text-mps-blue-700 rounded-lg font-medium">
                                  {team.name}
                                </span>
                              ))}
                              {user.teams.length > 2 && (
                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
                                  +{user.teams.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-slate-400 hover:text-mps-blue-600 hover:bg-mps-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredProfiles.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center">
                <Users size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No users found matching your search</p>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {editingUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setEditingUser(null)}
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
                      <User size={20} className="text-mps-blue-600" />
                      Edit User
                    </h2>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Email (read-only) */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                      <input
                        type="email"
                        value={editingUser.email}
                        disabled
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-500"
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={e => setEditFullName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ROLES.map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setEditRole(role)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 justify-center ${
                              editRole === role
                                ? 'bg-mps-blue-500 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {ROLE_ICONS[role]}
                            {getRoleDisplayName(role)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Student-specific fields */}
                    {editRole === 'student' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Grade</label>
                          <select
                            value={editGrade || ''}
                            onChange={e => setEditGrade(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
                          >
                            <option value="">Select Grade</option>
                            {GRADES.map(g => (
                              <option key={g} value={g}>Grade {g}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Section</label>
                          <select
                            value={editSection || ''}
                            onChange={e => setEditSection(e.target.value || undefined)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
                          >
                            <option value="">Select Section</option>
                            {SECTIONS.map(s => (
                              <option key={s} value={s}>Section {s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Team assignments (for staff) */}
                    {editRole !== 'student' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Team Assignments</label>
                        <div className="flex flex-wrap gap-2">
                          {allTeams.map(team => (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => toggleTeam(team.id)}
                              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                editTeamIds.includes(team.id)
                                  ? 'bg-mps-blue-500 text-white shadow-lg'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {team.name}
                            </button>
                          ))}
                        </div>
                        {allTeams.length === 0 && (
                          <p className="text-sm text-slate-500">No teams available</p>
                        )}
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setEditingUser(null)}
                        className="flex-1 btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving || !editFullName.trim()}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Check size={16} />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </ProtectedLayout>
  )
}
