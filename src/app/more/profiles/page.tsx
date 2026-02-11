'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  UserPlus,
  Search,
  Edit3,
  Save,
  X,
  Loader2,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  ProfileWithTeams,
  fetchAllProfiles,
  updateProfile,
  ROLE_COLORS,
} from '@/lib/admin'
import { UserRole, getRoleDisplayName } from '@/lib/supabase'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function ProfilesPage() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [profiles, setProfiles] = useState<ProfileWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'student' as UserRole,
    grade: '',
    section: '',
  })

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    const data = await fetchAllProfiles()
    setProfiles(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const filteredProfiles = profiles.filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.role?.toLowerCase().includes(q)
    )
  })

  const handleStartEdit = (p: ProfileWithTeams) => {
    setEditingProfile(p.id)
    setEditForm({
      full_name: p.full_name || '',
      role: p.role,
      grade: p.grade?.toString() || '',
      section: p.section || '',
    })
  }

  const handleSaveEdit = async (userId: string) => {
    setSaving(true)
    await updateProfile(userId, {
      full_name: editForm.full_name.trim(),
      role: editForm.role,
      grade: editForm.grade ? parseInt(editForm.grade) : undefined,
      section: editForm.section || undefined,
    })
    setEditingProfile(null)
    await loadProfiles()
    setSaving(false)
  }

  // Group profiles by role
  const roleGroups = ['admin', 'principal', 'coordinator', 'teacher', 'student'] as UserRole[]

  if (!user || !profile) return null

  return (
    <ProtectedLayout adminOnly>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page-theme="more">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl shadow-lg">
              <UserPlus className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Profiles</h1>
              <p className="text-slate-500 text-sm">Manage user profiles and roles</p>
            </div>
          </div>
          <span className="text-sm text-slate-500">{profiles.length} users</span>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pl-11"
            placeholder="Search by name, email, or role..."
          />
        </div>

        {/* Profiles List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading profiles...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-slate-700 mb-2">No Profiles Found</h3>
            <p className="text-slate-500">
              {searchQuery ? 'Try a different search term.' : 'No profiles exist yet.'}
            </p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            {filteredProfiles.map(p => (
              <motion.div key={p.id} variants={itemVariants} className="glass rounded-2xl overflow-hidden">
                {/* Profile Row */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white font-bold shadow-md">
                        {p.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        {editingProfile === p.id ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editForm.full_name}
                                onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                className="input-field py-1 text-sm w-48"
                                placeholder="Full name"
                              />
                              <select
                                value={editForm.role}
                                onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                                className="input-field py-1 text-sm w-36"
                              >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="coordinator">Coordinator</option>
                                <option value="principal">Principal</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                            {(editForm.role === 'student') && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={editForm.grade}
                                  onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                                  className="input-field py-1 text-sm w-20"
                                  placeholder="Grade"
                                  min="1"
                                  max="12"
                                />
                                <input
                                  type="text"
                                  value={editForm.section}
                                  onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                                  className="input-field py-1 text-sm w-20"
                                  placeholder="Section"
                                  maxLength={5}
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleSaveEdit(p.id)} disabled={saving} className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded">
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Save
                              </button>
                              <button onClick={() => setEditingProfile(null)} className="flex items-center gap-1 text-xs text-slate-400 hover:bg-slate-100 px-2 py-1 rounded">
                                <X size={12} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{p.full_name || 'No Name'}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[p.role]}`}>
                                {getRoleDisplayName(p.role)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{p.email}</p>
                            {p.role === 'student' && p.grade && (
                              <p className="text-xs text-slate-400">Grade {p.grade}{p.section ? `-${p.section}` : ''}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Teams/Classrooms info */}
                      {p.teams.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                          {p.teams.length} team{p.teams.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {isAdmin && editingProfile !== p.id && (
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedProfile(expandedProfile === p.id ? null : p.id)}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                      >
                        {expandedProfile === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedProfile === p.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                        {p.teams.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                              <Users size={12} /> Teams
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {p.teams.map(t => (
                                <span key={t.id} className="text-xs px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-600">
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-400">
                          <p>Created: {new Date(p.created_at).toLocaleDateString()}</p>
                          <p>ID: {p.id}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </ProtectedLayout>
  )
}
