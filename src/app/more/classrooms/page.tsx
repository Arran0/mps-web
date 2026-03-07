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
  Save,
  Loader2,
  Users,
  Lock,
  Trash2,
} from 'lucide-react'
import {
  ClassroomWithDetails,
  ClassroomMemberRole,
  fetchClassroomsForUser,
  createClassroom,
  updateClassroom,
  fetchClassroomById,
  addMemberByEmail,
  removeClassroomMember,
  deleteClassroom,
  isClassroomClosed,
} from '@/lib/classrooms'
import { supabase } from '@/lib/supabase'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function ClassroomManagerPage() {
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

  // Edit state
  const [editingClassroom, setEditingClassroom] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  })
  const [saving, setSaving] = useState(false)

  // Add member
  const [addMemberEmailInput, setAddMemberEmailInput] = useState('')
  const [addMemberRole, setAddMemberRole] = useState<ClassroomMemberRole>('student')
  const [addingMember, setAddingMember] = useState<string | null>(null)
  const [memberError, setMemberError] = useState('')

  // Load all classrooms (active + closed) for manager
  const loadClassrooms = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    const data = await fetchClassroomsForUser(user.id, profile.role, true)
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
      setEditingClassroom(null)
    } else {
      setExpandedClassroom(classroomId)
      await loadClassroomDetails(classroomId)
    }
  }

  const handleStartEdit = (classroom: ClassroomWithDetails) => {
    setEditingClassroom(classroom.id)
    setEditForm({
      title: classroom.title,
      description: classroom.description || '',
      start_date: classroom.start_date || '',
      end_date: classroom.end_date || '',
    })
  }

  const handleSaveEdit = async (classroomId: string) => {
    if (!editForm.title.trim()) return
    setSaving(true)
    const ok = await updateClassroom(classroomId, {
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
    })
    if (ok) {
      setEditingClassroom(null)
      await loadClassrooms()
      if (expandedClassroom === classroomId) {
        await loadClassroomDetails(classroomId)
      }
    }
    setSaving(false)
  }

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassroom.title.trim() || !user || !profile) return
    setCreating(true)

    // Resolve coordinator — only coordinator/principal/admin are eligible
    let coordinatorId: string | undefined
    if (newClassroom.coordinator_email.trim()) {
      const { data: coordProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', newClassroom.coordinator_email.trim().toLowerCase())
        .in('role', ['coordinator', 'principal', 'admin'])
        .single()
      if (coordProfile) {
        coordinatorId = coordProfile.id
      } else {
        setCreating(false)
        alert('Coordinator email not found or user does not have a coordinator/principal/admin role.')
        return
      }
    }

    const result = await createClassroom({
      title: newClassroom.title.trim(),
      description: newClassroom.description.trim() || undefined,
      start_date: newClassroom.start_date || undefined,
      end_date: newClassroom.end_date || undefined,
      coordinator_id: coordinatorId,
      creatorRole: profile.role,
    }, user.id)

    if (result) {
      // Add teacher by email if provided
      if (newClassroom.teacher_email.trim()) {
        await addMemberByEmail(result.id, newClassroom.teacher_email.trim(), 'teacher')
      }

      // Auto-add all principals and admins as members using their actual role
      const { data: defaultMembers } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['principal', 'admin'])

      for (const member of defaultMembers ?? []) {
        if (member.id === user.id) continue // creator already added
        if (member.id === coordinatorId) continue // coordinator already added
        const { error } = await supabase
          .from('classroom_members')
          .insert({ classroom_id: result.id, user_id: member.id, role: member.role })
        if (error && error.code !== '23505') {
          console.error('Failed to add default member:', error.message)
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

    const result = await addMemberByEmail(classroomId, addMemberEmailInput.trim(), addMemberRole)
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

  const handleDeleteClassroom = async (classroomId: string, title: string) => {
    if (!window.confirm(`Delete classroom "${title}"? This cannot be undone.`)) return
    const ok = await deleteClassroom(classroomId)
    if (ok) {
      if (expandedClassroom === classroomId) {
        setExpandedClassroom(null)
        setExpandedDetails(null)
      }
      await loadClassrooms()
    }
  }

  if (!user || !profile) return null

  // Split classrooms into active and closed
  const activeClassrooms = classrooms.filter(c => !isClassroomClosed(c))
  const closedClassrooms = classrooms.filter(c => isClassroomClosed(c))

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
            {isAdmin && (
              <button onClick={() => setShowCreateForm(true)} className="btn-primary">
                <Plus size={16} className="inline mr-1" /> Create Classroom
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Classrooms */}
            {activeClassrooms.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Active ({activeClassrooms.length})
                </h2>
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                  {activeClassrooms.map(classroom => (
                    <ClassroomCard
                      key={classroom.id}
                      classroom={classroom}
                      closed={false}
                      isAdmin={isAdmin}
                      expanded={expandedClassroom === classroom.id}
                      expandedDetails={expandedClassroom === classroom.id ? expandedDetails : null}
                      editing={editingClassroom === classroom.id}
                      editForm={editForm}
                      saving={saving}
                      addMemberEmailInput={addMemberEmailInput}
                      addMemberRole={addMemberRole}
                      addingMember={addingMember}
                      memberError={memberError}
                      onExpand={() => handleExpand(classroom.id)}
                      onStartEdit={() => handleStartEdit(classroom)}
                      onCancelEdit={() => setEditingClassroom(null)}
                      onSaveEdit={() => handleSaveEdit(classroom.id)}
                      onEditFormChange={setEditForm}
                      onAddMemberEmailChange={(v) => { setAddMemberEmailInput(v); setMemberError('') }}
                      onAddMemberRoleChange={setAddMemberRole}
                      onAddMember={() => handleAddMember(classroom.id)}
                      onRemoveMember={(uid, role) => handleRemoveMember(classroom.id, uid, role)}
                      onDelete={() => handleDeleteClassroom(classroom.id, classroom.title)}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* Closed Classrooms */}
            {closedClassrooms.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Lock size={14} />
                  Closed ({closedClassrooms.length})
                </h2>
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                  {closedClassrooms.map(classroom => (
                    <ClassroomCard
                      key={classroom.id}
                      classroom={classroom}
                      closed={true}
                      isAdmin={isAdmin}
                      expanded={expandedClassroom === classroom.id}
                      expandedDetails={expandedClassroom === classroom.id ? expandedDetails : null}
                      editing={editingClassroom === classroom.id}
                      editForm={editForm}
                      saving={saving}
                      addMemberEmailInput={addMemberEmailInput}
                      addMemberRole={addMemberRole}
                      addingMember={addingMember}
                      memberError={memberError}
                      onExpand={() => handleExpand(classroom.id)}
                      onStartEdit={() => handleStartEdit(classroom)}
                      onCancelEdit={() => setEditingClassroom(null)}
                      onSaveEdit={() => handleSaveEdit(classroom.id)}
                      onEditFormChange={setEditForm}
                      onAddMemberEmailChange={(v) => { setAddMemberEmailInput(v); setMemberError('') }}
                      onAddMemberRoleChange={setAddMemberRole}
                      onAddMember={() => handleAddMember(classroom.id)}
                      onRemoveMember={(uid, role) => handleRemoveMember(classroom.id, uid, role)}
                      onDelete={() => handleDeleteClassroom(classroom.id, classroom.title)}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}

// --- ClassroomCard sub-component ---

interface EditFormState {
  title: string
  description: string
  start_date: string
  end_date: string
}

interface ClassroomCardProps {
  classroom: ClassroomWithDetails
  closed: boolean
  isAdmin: boolean
  expanded: boolean
  expandedDetails: ClassroomWithDetails | null
  editing: boolean
  editForm: EditFormState
  saving: boolean
  addMemberEmailInput: string
  addMemberRole: ClassroomMemberRole
  addingMember: string | null
  memberError: string
  onExpand: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditFormChange: (form: EditFormState) => void
  onAddMemberEmailChange: (v: string) => void
  onAddMemberRoleChange: (role: ClassroomMemberRole) => void
  onAddMember: () => void
  onRemoveMember: (userId: string, role: string) => void
  onDelete: () => void
}

function ClassroomCard({
  classroom,
  closed,
  isAdmin,
  expanded,
  expandedDetails,
  editing,
  editForm,
  saving,
  addMemberEmailInput,
  addMemberRole,
  addingMember,
  memberError,
  onExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
  onAddMemberEmailChange,
  onAddMemberRoleChange,
  onAddMember,
  onRemoveMember,
  onDelete,
}: ClassroomCardProps) {
  return (
    <motion.div variants={itemVariants} className={`glass rounded-2xl overflow-hidden ${closed ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div
        className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={onExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ${closed ? 'bg-slate-400' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
              {closed ? <Lock size={20} /> : classroom.title.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-slate-800">{classroom.title}</h3>
                {closed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-medium">Closed</span>
                )}
              </div>
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
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onStartEdit() }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit classroom"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete() }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete classroom"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
            {expanded
              ? <ChevronUp size={20} className="text-slate-400" />
              : <ChevronDown size={20} className="text-slate-400" />
            }
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 p-5">
              {/* Edit Form */}
              {editing && isAdmin && (
                <div className="mb-5 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Edit3 size={14} /> Edit Classroom
                    {closed && <span className="text-xs font-normal text-amber-600">(Closed — admin only)</span>}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => onEditFormChange({ ...editForm, title: e.target.value })}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={e => onEditFormChange({ ...editForm, description: e.target.value })}
                        className="input-field text-sm resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                        <input
                          type="date"
                          value={editForm.start_date}
                          onChange={e => onEditFormChange({ ...editForm, start_date: e.target.value })}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          onChange={e => onEditFormChange({ ...editForm, end_date: e.target.value })}
                          className="input-field text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={onCancelEdit} className="btn-ghost text-sm py-1.5">Cancel</button>
                      <button
                        onClick={onSaveEdit}
                        disabled={saving}
                        className="btn-primary text-sm py-1.5 flex items-center gap-1.5"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members */}
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Members</h4>
              <div className="space-y-2 mb-4">
                {!expandedDetails ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Loading members...
                  </div>
                ) : expandedDetails.members.length === 0 ? (
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
                      {isAdmin && !['principal', 'admin'].includes(member.role) && !closed && (
                        <button
                          onClick={() => onRemoveMember(member.user_id, member.role)}
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

              {/* Add Member — only for active classrooms */}
              {isAdmin && (!closed) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-0 relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={addMemberEmailInput}
                      onChange={e => onAddMemberEmailChange(e.target.value)}
                      className="input-field pl-10 py-2 text-sm w-full"
                      placeholder="Add member by email..."
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddMember() } }}
                    />
                  </div>
                  <select
                    value={addMemberRole}
                    onChange={e => onAddMemberRoleChange(e.target.value as ClassroomMemberRole)}
                    className="input-field py-2 text-sm w-auto"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                  <button
                    onClick={onAddMember}
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
              {closed && !isAdmin && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                  <Lock size={12} /> This classroom is closed. Contact an admin to make changes.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
