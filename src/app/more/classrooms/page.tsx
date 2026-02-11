'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  BookOpen,
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
  Users,
} from 'lucide-react'
import {
  ClassroomWithDetails,
  fetchClassroomsForUser,
  createClassroom,
  fetchClassroomById,
  addMemberByEmail,
  removeClassroomMember,
} from '@/lib/classrooms'
import { supabase, UserProfile } from '@/lib/supabase'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function ClassroomCreationPage() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedClassroom, setExpandedClassroom] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<ClassroomWithDetails | null>(null)

  // Create form state
  const [newClassroom, setNewClassroom] = useState({
    title: '',
    description: '',
    grade: '',
    section: '',
    start_date: '',
    end_date: '',
    coordinator_email: '',
    teacher_email: '',
  })
  const [creating, setCreating] = useState(false)

  // Add member
  const [addMemberEmailInput, setAddMemberEmailInput] = useState('')
  const [addingMember, setAddingMember] = useState<string | null>(null)
  const [memberError, setMemberError] = useState('')

  const loadClassrooms = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    const data = await fetchClassroomsForUser(user.id, profile.role)
    setClassrooms(data)
    setLoading(false)
  }, [user, profile])

  useEffect(() => {
    loadClassrooms()
  }, [loadClassrooms])

  const loadClassroomDetails = async (classroomId: string) => {
    const details = await fetchClassroomById(classroomId)
    if (details) {
      setExpandedDetails(details)
    }
  }

  const handleExpand = async (classroomId: string) => {
    if (expandedClassroom === classroomId) {
      setExpandedClassroom(null)
      setExpandedDetails(null)
    } else {
      setExpandedClassroom(classroomId)
      await loadClassroomDetails(classroomId)
    }
  }

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassroom.title.trim() || !user) return
    setCreating(true)

    // Resolve coordinator
    let coordinatorId: string | undefined
    if (newClassroom.coordinator_email.trim()) {
      const { data: coordProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newClassroom.coordinator_email.trim().toLowerCase())
        .single()
      if (coordProfile) coordinatorId = coordProfile.id
    }

    const classroomCode = `${newClassroom.grade || '0'}-${newClassroom.section || 'A'}-${Date.now().toString(36)}`

    const result = await createClassroom({
      title: newClassroom.title.trim(),
      description: newClassroom.description.trim() || undefined,
      start_date: newClassroom.start_date || undefined,
      end_date: newClassroom.end_date || undefined,
      classroom_code: classroomCode,
      coordinator_id: coordinatorId,
    }, user.id)

    if (result) {
      // Add teacher by email if provided
      if (newClassroom.teacher_email.trim()) {
        await addMemberByEmail(result.id, newClassroom.teacher_email.trim(), 'teacher')
      }

      // Add all principals and admins as default members
      const { data: defaultMembers } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['principal', 'admin'])

      for (const member of defaultMembers ?? []) {
        if (member.id !== user.id && member.id !== coordinatorId) {
          await addMemberByEmail(result.id, '', 'admin').catch(() => {})
          // Use direct add instead
          const { error } = await supabase
            .from('classroom_members')
            .insert({ classroom_id: result.id, user_id: member.id, role: 'admin' })
          if (error && error.code !== '23505') {
            console.error('Failed to add default member:', error.message)
          }
        }
      }

      setNewClassroom({ title: '', description: '', grade: '', section: '', start_date: '', end_date: '', coordinator_email: '', teacher_email: '' })
      setShowCreateForm(false)
      await loadClassrooms()
    }
    setCreating(false)
  }

  const handleAddMember = async (classroomId: string) => {
    if (!addMemberEmailInput.trim()) return
    setAddingMember(classroomId)
    setMemberError('')

    const result = await addMemberByEmail(classroomId, addMemberEmailInput.trim(), 'student')
    if (result.success) {
      setAddMemberEmailInput('')
      await loadClassroomDetails(classroomId)
    } else {
      setMemberError(result.error || 'Failed to add member')
    }
    setAddingMember(null)
  }

  const handleRemoveMember = async (classroomId: string, userId: string, memberRole: string) => {
    if (['principal', 'admin'].includes(memberRole)) return
    await removeClassroomMember(classroomId, userId)
    await loadClassroomDetails(classroomId)
  }

  if (!user || !profile) return null

  return (
    <ProtectedLayout adminOnly>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page-theme="more">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Classrooms</h1>
              <p className="text-slate-500 text-sm">Create and manage classrooms</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Create Classroom
            </button>
          )}
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <form onSubmit={handleCreateClassroom} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-bold text-slate-800">New Classroom</h3>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newClassroom.title}
                      onChange={e => setNewClassroom({ ...newClassroom, title: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Class 10-A Science"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                      <input
                        type="number"
                        value={newClassroom.grade}
                        onChange={e => setNewClassroom({ ...newClassroom, grade: e.target.value })}
                        className="input-field"
                        placeholder="10"
                        min="1"
                        max="12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                      <input
                        type="text"
                        value={newClassroom.section}
                        onChange={e => setNewClassroom({ ...newClassroom, section: e.target.value })}
                        className="input-field"
                        placeholder="A"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={newClassroom.description}
                    onChange={e => setNewClassroom({ ...newClassroom, description: e.target.value })}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Brief description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coordinator Email</label>
                    <input
                      type="email"
                      value={newClassroom.coordinator_email}
                      onChange={e => setNewClassroom({ ...newClassroom, coordinator_email: e.target.value })}
                      className="input-field"
                      placeholder="coordinator@school.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teacher Email</label>
                    <input
                      type="email"
                      value={newClassroom.teacher_email}
                      onChange={e => setNewClassroom({ ...newClassroom, teacher_email: e.target.value })}
                      className="input-field"
                      placeholder="teacher@school.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={newClassroom.start_date}
                      onChange={e => setNewClassroom({ ...newClassroom, start_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={newClassroom.end_date}
                      onChange={e => setNewClassroom({ ...newClassroom, end_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateForm(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Create Classroom
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Classrooms List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading classrooms...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <BookOpen size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-slate-700 mb-2">No Classrooms Yet</h3>
            <p className="text-slate-500 mb-6">Create your first classroom to get started.</p>
            <button onClick={() => setShowCreateForm(true)} className="btn-primary">
              <Plus size={16} className="inline mr-1" /> Create Classroom
            </button>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {classrooms.map(classroom => (
              <motion.div key={classroom.id} variants={itemVariants} className="glass rounded-2xl overflow-hidden">
                {/* Classroom Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => handleExpand(classroom.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg">
                        {classroom.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-slate-800">{classroom.title}</h3>
                        {classroom.description && (
                          <p className="text-sm text-slate-500">{classroom.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Users size={12} /> {classroom.member_count || 0} members
                          </span>
                          {classroom.start_date && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(classroom.start_date).toLocaleDateString()}
                              {classroom.end_date && ` - ${new Date(classroom.end_date).toLocaleDateString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedClassroom === classroom.id
                      ? <ChevronUp size={20} className="text-slate-400" />
                      : <ChevronDown size={20} className="text-slate-400" />
                    }
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedClassroom === classroom.id && expandedDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 p-5">
                        {/* Members */}
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Members</h4>
                        <div className="space-y-2 mb-4">
                          {expandedDetails.members.length === 0 ? (
                            <p className="text-sm text-slate-500">No members yet</p>
                          ) : (
                            expandedDetails.members.map(member => (
                              <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/80">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white text-xs font-bold">
                                    {member.user?.full_name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{member.user?.full_name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500">{member.user?.email}</p>
                                  </div>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 capitalize">{member.role}</span>
                                </div>
                                {isAdmin && !['principal', 'admin'].includes(member.role) && (
                                  <button
                                    onClick={() => handleRemoveMember(classroom.id, member.user_id, member.role)}
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
                              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="email"
                                value={addMemberEmailInput}
                                onChange={e => { setAddMemberEmailInput(e.target.value); setMemberError('') }}
                                className="input-field pl-9 py-2 text-sm"
                                placeholder="Add member by email..."
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(classroom.id) } }}
                              />
                            </div>
                            <button
                              onClick={() => handleAddMember(classroom.id)}
                              disabled={addingMember === classroom.id}
                              className="btn-primary py-2 text-sm"
                            >
                              {addingMember === classroom.id ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
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
