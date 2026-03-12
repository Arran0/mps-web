'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users,
  Plus,
  X,
  Mail,
  UserMinus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Edit3,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react'
import {
  TeamWithDetails,
  fetchAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMemberByEmail,
  removeTeamMember,
} from '@/lib/teams'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function TeacherTeamsPage() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [teams, setTeams] = useState<TeamWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)

  // Create form state
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    coordinator_email: '',
  })
  const [creating, setCreating] = useState(false)

  // Add member state
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState<string | null>(null)
  const [memberError, setMemberError] = useState('')

  // Edit state
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const loadTeams = useCallback(async () => {
    setLoading(true)
    const data = await fetchAllTeams()
    setTeams(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeam.name.trim()) return
    setCreating(true)

    const result = await createTeam({
      name: newTeam.name.trim(),
      description: newTeam.description.trim() || undefined,
      start_date: newTeam.start_date || undefined,
      end_date: newTeam.end_date || undefined,
      coordinator_email: newTeam.coordinator_email.trim() || undefined,
    })

    if (result) {
      setNewTeam({ name: '', description: '', start_date: '', end_date: '', coordinator_email: '' })
      setShowCreateForm(false)
      await loadTeams()
    }
    setCreating(false)
  }

  const handleAddMember = async (teamId: string) => {
    if (!addMemberEmail.trim()) return
    setAddingMember(teamId)
    setMemberError('')

    const result = await addTeamMemberByEmail(teamId, addMemberEmail.trim())
    if (result.success) {
      setAddMemberEmail('')
      await loadTeams()
    } else {
      setMemberError(result.error || 'Failed to add member')
    }
    setAddingMember(null)
  }

  const handleRemoveMember = async (teamId: string, userId: string) => {
    await removeTeamMember(teamId, userId)
    await loadTeams()
  }

  const handleStartEdit = (team: TeamWithDetails) => {
    setEditingTeam(team.id)
    setEditForm({ name: team.name, description: team.description || '' })
  }

  const handleSaveEdit = async (teamId: string) => {
    setSaving(true)
    await updateTeam(teamId, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
    })
    setEditingTeam(null)
    await loadTeams()
    setSaving(false)
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return
    await deleteTeam(teamId)
    await loadTeams()
  }

  if (!user || !profile) return null

  return (
    <ProtectedLayout adminOnly>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page-theme="more">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl shadow-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Teacher Teams</h1>
              <p className="text-slate-500 text-sm">Manage teacher teams and coordinators</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Create Team
            </button>
          )}
        </div>

        {/* Create Team Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <form onSubmit={handleCreateTeam} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-bold text-slate-800">New Teacher Team</h3>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Team Name *</label>
                    <input
                      type="text"
                      value={newTeam.name}
                      onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Science Department"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coordinator Email</label>
                    <input
                      type="email"
                      value={newTeam.coordinator_email}
                      onChange={e => setNewTeam({ ...newTeam, coordinator_email: e.target.value })}
                      className="input-field"
                      placeholder="coordinator@school.com"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={newTeam.description}
                    onChange={e => setNewTeam({ ...newTeam, description: e.target.value })}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Brief description of the team..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newTeam.start_date}
                      onChange={e => setNewTeam({ ...newTeam, start_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newTeam.end_date}
                      onChange={e => setNewTeam({ ...newTeam, end_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateForm(false)} className="btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Create Team
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Teams List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-slate-700 mb-2">No Teams Yet</h3>
            <p className="text-slate-500 mb-6">Create your first teacher team to get started.</p>
            <button onClick={() => setShowCreateForm(true)} className="btn-primary">
              <Plus size={16} className="inline mr-1" /> Create Team
            </button>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {teams.map(team => (
              <motion.div key={team.id} variants={itemVariants} className="glass rounded-2xl overflow-hidden">
                {/* Team Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        {editingTeam === team.id ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="input-field py-1 text-sm"
                            />
                            <button onClick={() => handleSaveEdit(team.id)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setEditingTeam(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-display text-lg font-bold text-slate-800">{team.name}</h3>
                            {team.description && (
                              <p className="text-sm text-slate-500">{team.description}</p>
                            )}
                          </>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">{team.member_count} members</span>
                          {team.coordinator && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                              Coord: {team.coordinator.full_name}
                            </span>
                          )}
                          {team.start_date && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(team.start_date).toLocaleDateString()}
                              {team.end_date && ` - ${new Date(team.end_date).toLocaleDateString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); handleStartEdit(team) }}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id) }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {expandedTeam === team.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedTeam === team.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 p-5">
                        {/* Members List */}
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Members</h4>
                        <div className="space-y-2 mb-4">
                          {team.members.length === 0 ? (
                            <p className="text-sm text-slate-500">No members yet</p>
                          ) : (
                            team.members.map(member => (
                              <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/80">
                                <div className="flex items-center gap-3">
                                  <Avatar avatarUrl={member.user?.avatar_url} name={member.user?.full_name} size={32} />
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{member.user?.full_name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500">{member.user?.email}</p>
                                  </div>
                                  {member.user?.role && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 capitalize">{member.user.role}</span>
                                  )}
                                </div>
                                {isAdmin && member.user?.role !== 'principal' && member.user?.role !== 'admin' && (
                                  <button
                                    onClick={() => handleRemoveMember(team.id, member.user_id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Remove member"
                                  >
                                    <UserMinus size={14} />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Member */}
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="email"
                                value={addMemberEmail}
                                onChange={e => { setAddMemberEmail(e.target.value); setMemberError('') }}
                                className="input-field pl-10 py-2 text-sm"
                                placeholder="Add member by email..."
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(team.id) } }}
                              />
                            </div>
                            <button
                              onClick={() => handleAddMember(team.id)}
                              disabled={addingMember === team.id}
                              className="btn-primary py-2 text-sm"
                            >
                              {addingMember === team.id ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
                            </button>
                          </div>
                        )}
                        {memberError && (
                          <p className="text-xs text-rose-500 mt-2">{memberError}</p>
                        )}
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
