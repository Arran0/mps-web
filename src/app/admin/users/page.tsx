'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import {
  Users, Search, Edit3, Check, X, GraduationCap, Briefcase,
  Shield, Crown, Settings, AlertCircle, Plus, ChevronDown, Copy, Link,
} from 'lucide-react'
import {
  ProfileWithTeams, fetchAllProfiles, updateProfile,
  updateTeamMemberships, fetchAllTeams, createNewUser, ROLE_COLORS,
} from '@/lib/admin'
import { UserRole, getRoleDisplayName } from '@/lib/supabase'

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  student: <GraduationCap size={12} />,
  teacher: <Briefcase size={12} />,
  coordinator: <Shield size={12} />,
  principal: <Crown size={12} />,
  admin: <Settings size={12} />,
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
  const [showCreate, setShowCreate] = useState(false)

  // Edit modal state
  const [editingUser, setEditingUser] = useState<ProfileWithTeams | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('student')
  const [editGrade, setEditGrade] = useState<number | undefined>()
  const [editSection, setEditSection] = useState<string | undefined>()
  const [editTeamIds, setEditTeamIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [newEmail, setNewEmail] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('student')
  const [newGrade, setNewGrade] = useState<number | undefined>()
  const [newSection, setNewSection] = useState<string | undefined>()
  const [newTeamIds, setNewTeamIds] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (profile && profile.role !== 'admin') router.push('/home')
  }, [profile, router])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [profilesData, teamsData] = await Promise.all([fetchAllProfiles(), fetchAllTeams()])
    setProfiles(profilesData)
    setAllTeams(teamsData)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || p.role === filterRole
    return matchesSearch && matchesRole
  })

  const openEditModal = (u: ProfileWithTeams) => {
    setEditingUser(u)
    setEditFullName(u.full_name)
    setEditRole(u.role)
    setEditGrade(u.grade || undefined)
    setEditSection(u.section || undefined)
    setEditTeamIds(u.teams.map(t => t.id))
    setError(null)
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true); setError(null)
    const profileUpdated = await updateProfile(editingUser.id, {
      full_name: editFullName,
      role: editRole,
      grade: editRole === 'student' ? editGrade : undefined,
      section: editRole === 'student' ? editSection : undefined,
    })
    if (!profileUpdated) { setError('Failed to update profile'); setSaving(false); return }
    if (editRole !== 'student') {
      const teamsUpdated = await updateTeamMemberships(editingUser.id, editTeamIds)
      if (!teamsUpdated) { setError('Failed to update team memberships'); setSaving(false); return }
    }
    setSaving(false)
    setEditingUser(null)
    loadData()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !newFullName.trim()) return
    setCreating(true); setCreateError(null)
    const result = await createNewUser({
      email: newEmail.trim(),
      full_name: newFullName.trim(),
      role: newRole,
      grade: newRole === 'student' ? newGrade : undefined,
      section: newRole === 'student' ? newSection : undefined,
      team_ids: newRole !== 'student' ? newTeamIds : undefined,
    })
    setCreating(false)
    if (!result.success) { setCreateError(result.error || 'Failed to create user'); return }
    setNewEmail(''); setNewFullName(''); setNewRole('student'); setNewGrade(undefined)
    setNewSection(undefined); setNewTeamIds([]); setShowCreate(false)
    if (result.inviteLink) {
      setInviteLink(result.inviteLink)
    }
    loadData()
  }

  const toggleTeam = (teamId: string) =>
    setEditTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId])

  const toggleNewTeam = (teamId: string) =>
    setNewTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId])

  const handleCopyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (!user || !profile || profile.role !== 'admin') return null

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl shadow">
              <Users className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-800">User Management</h1>
              <p className="text-xs text-slate-500">{profiles.length} total users</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(prev => !prev)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Create User
          </button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="overflow-hidden mb-4"
            >
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">New User</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="Email *" required
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40 bg-white"
                  />
                  <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)}
                    placeholder="Full Name *" required
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40 bg-white"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setNewRole(r)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        newRole === r ? 'bg-mps-blue-500 text-white border-mps-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:border-mps-blue-300'
                      }`}
                    >
                      {ROLE_ICONS[r]} {getRoleDisplayName(r)}
                    </button>
                  ))}
                </div>
                {newRole === 'student' && (
                  <div className="flex gap-2">
                    <select value={newGrade || ''} onChange={e => setNewGrade(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40"
                    >
                      <option value="">Grade</option>
                      {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                    <select value={newSection || ''} onChange={e => setNewSection(e.target.value || undefined)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40"
                    >
                      <option value="">Section</option>
                      {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                )}
                {newRole !== 'student' && allTeams.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {allTeams.map(t => (
                      <button key={t.id} type="button" onClick={() => toggleNewTeam(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          newTeamIds.includes(t.id) ? 'bg-mps-blue-500 text-white border-mps-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:border-mps-blue-300'
                        }`}
                      >{t.name}</button>
                    ))}
                  </div>
                )}
                {createError && (
                  <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {createError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancel</button>
                  <button type="submit" disabled={creating || !newEmail.trim() || !newFullName.trim()}
                    className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus size={14} /> {creating ? 'Creating…' : 'Create User'}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40 bg-white"
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value as UserRole | 'all')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40"
          >
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{getRoleDisplayName(r)}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12"><div className="spinner mx-auto mb-3" /><p className="text-sm text-slate-500">Loading users...</p></div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <div>Name</div>
              <div>Role</div>
              <div>Grade / Section</div>
              <div>Teams</div>
              <div></div>
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="py-10 text-center">
                <Users size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No users found</p>
              </div>
            ) : (
              filteredProfiles.map((u, idx) => (
                <div
                  key={u.id}
                  className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-2.5 hover:bg-slate-50 transition-colors ${
                    idx < filteredProfiles.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  {/* Name + email */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar avatarUrl={u.avatar_url} name={u.full_name} size={32} />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{u.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role]}`}>
                      {ROLE_ICONS[u.role]}
                      {getRoleDisplayName(u.role)}
                    </span>
                  </div>

                  {/* Grade/Section */}
                  <div className="text-sm text-slate-600">
                    {u.role === 'student' && u.grade
                      ? <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-md">Gr.{u.grade}{u.section ? `·${u.section}` : ''}</span>
                      : <span className="text-slate-300">—</span>
                    }
                  </div>

                  {/* Teams */}
                  <div className="flex gap-1 flex-wrap">
                    {u.teams.slice(0, 2).map(t => (
                      <span key={t.id} className="text-[11px] px-1.5 py-0.5 bg-mps-blue-50 text-mps-blue-700 rounded-md font-medium">{t.name}</span>
                    ))}
                    {u.teams.length > 2 && (
                      <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">+{u.teams.length - 2}</span>
                    )}
                    {u.teams.length === 0 && <span className="text-slate-300 text-xs">—</span>}
                  </div>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-1.5 text-slate-300 hover:text-mps-blue-600 hover:bg-mps-blue-50 rounded-lg transition-colors ml-2"
                    title="Edit user"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Invite Link Modal (shown when email rate limit hit) */}
        {typeof document !== 'undefined' && inviteLink && createPortal(
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setInviteLink(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-xl"><Link size={18} className="text-amber-600" /></div>
                <div>
                  <h2 className="font-bold text-slate-800">Email rate limit reached</h2>
                  <p className="text-xs text-slate-500">User created — share this invite link manually</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-500 mb-1.5">Invite link (expires in 24 hours)</p>
                <p className="text-xs font-mono text-slate-700 break-all select-all">{inviteLink}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
                >
                  <Copy size={14} /> {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <button onClick={() => setInviteLink(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}

        {/* Edit Modal */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {editingUser && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setEditingUser(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
                    <div>
                      <h2 className="font-bold text-slate-800">Edit User</h2>
                      <p className="text-xs text-slate-400">{editingUser.email}</p>
                    </div>
                    <button onClick={() => setEditingUser(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Full Name</label>
                      <input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Role</label>
                      <div className="flex flex-wrap gap-1.5">
                        {ROLES.map(r => (
                          <button key={r} type="button" onClick={() => setEditRole(r)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              editRole === r ? 'bg-mps-blue-500 text-white border-mps-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:border-mps-blue-300'
                            }`}
                          >
                            {ROLE_ICONS[r]} {getRoleDisplayName(r)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Student fields */}
                    {editRole === 'student' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Grade</label>
                          <select value={editGrade || ''} onChange={e => setEditGrade(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40"
                          >
                            <option value="">No Grade</option>
                            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Section</label>
                          <select value={editSection || ''} onChange={e => setEditSection(e.target.value || undefined)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/40"
                          >
                            <option value="">No Section</option>
                            {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Team assignments */}
                    {editRole !== 'student' && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Teams</label>
                        {allTeams.length === 0 ? (
                          <p className="text-sm text-slate-400">No teams available</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {allTeams.map(t => (
                              <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  editTeamIds.includes(t.id) ? 'bg-mps-blue-500 text-white border-mps-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:border-mps-blue-300'
                                }`}
                              >{t.name}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                        <AlertCircle size={14} className="flex-shrink-0" /> {error}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingUser(null)} className="flex-1 btn-secondary text-sm">Cancel</button>
                      <button onClick={handleSave} disabled={saving || !editFullName.trim()}
                        className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}
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
