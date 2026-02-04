'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Clock,
  Tag,
  Plus,
  Trash2,
  Star,
  Users,
  ChevronRight,
  ListOrdered,
  FileText,
  AlertCircle,
  Edit3,
  Check,
} from 'lucide-react'
import {
  ProjectWithDetails,
  Subtask,
  NewSubtaskInput,
  updateSubtaskStatus,
  addSubtask,
  deleteSubtask,
  deleteProject,
  updateProject,
} from '@/lib/projects'
import {
  TaskStatus,
  TaskTag,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  getNextStatus,
} from '@/lib/tasks'
import { UserProfile } from '@/lib/supabase'

interface ProjectCardProps {
  project: ProjectWithDetails
  canEdit: boolean
  canCheck: boolean
  onClose: () => void
  onUpdated: () => void
}

export default function ProjectCard({
  project,
  canEdit,
  canCheck,
  onClose,
  onUpdated,
}: ProjectCardProps) {
  const [localProject, setLocalProject] = useState(project)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title)
  const [descDraft, setDescDraft] = useState(project.description || '')
  const [editingDates, setEditingDates] = useState(false)
  const [startDateDraft, setStartDateDraft] = useState(project.start_date || '')
  const [endDateDraft, setEndDateDraft] = useState(project.end_date || '')
  const [showAddSubtask, setShowAddSubtask] = useState(false)
  const [selectedSubtask, setSelectedSubtask] = useState<Subtask | null>(null)
  const [sequentialTooltip, setSequentialTooltip] = useState<string | null>(null)

  // Add subtask form state
  const [newSubTitle, setNewSubTitle] = useState('')
  const [newSubDesc, setNewSubDesc] = useState('')
  const [newSubDueDate, setNewSubDueDate] = useState('')
  const [newSubTiming, setNewSubTiming] = useState('')
  const [newSubTag, setNewSubTag] = useState<TaskTag>(null)
  const [newSubAssignee, setNewSubAssignee] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Keep local state in sync when project prop updates
  useEffect(() => {
    setLocalProject(project)
  }, [project])

  const handleSaveTitle = async () => {
    if (!titleDraft.trim()) return
    const ok = await updateProject(localProject.id, { title: titleDraft.trim() })
    if (ok) {
      setLocalProject(prev => ({ ...prev, title: titleDraft.trim() }))
      setEditingTitle(false)
      onUpdated()
    }
  }

  const handleSaveDesc = async () => {
    const ok = await updateProject(localProject.id, { description: descDraft.trim() || null })
    if (ok) {
      setLocalProject(prev => ({ ...prev, description: descDraft.trim() || null }))
      setEditingDesc(false)
      onUpdated()
    }
  }

  const handleSaveDates = async () => {
    const ok = await updateProject(localProject.id, {
      start_date: startDateDraft || null,
      end_date: endDateDraft || null,
    })
    if (ok) {
      setLocalProject(prev => ({
        ...prev,
        start_date: startDateDraft || null,
        end_date: endDateDraft || null,
      }))
      setEditingDates(false)
      onUpdated()
    }
  }

  const handleToggleSequential = async () => {
    const newValue = !localProject.sequential_mode
    const ok = await updateProject(localProject.id, { sequential_mode: newValue })
    if (ok) {
      setLocalProject(prev => ({ ...prev, sequential_mode: newValue }))
      onUpdated()
    }
  }

  const handleSubtaskStatusTap = async (subtask: Subtask) => {
    const next = getNextStatus(subtask.status, canCheck)
    if (next === subtask.status) return

    const result = await updateSubtaskStatus(
      subtask.id,
      next,
      localProject.id,
      localProject.sequential_mode
    )

    if (result.success) {
      setLocalProject(prev => ({
        ...prev,
        subtasks: prev.subtasks.map(s =>
          s.id === subtask.id ? { ...s, status: next } : s
        ),
      }))
      onUpdated()
    } else if (result.error) {
      setSequentialTooltip(result.error)
      setTimeout(() => setSequentialTooltip(null), 2500)
    }
  }

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubTitle.trim()) return

    setSubmitting(true)
    const input: NewSubtaskInput = {
      title: newSubTitle.trim(),
      description: newSubDesc.trim() || undefined,
      due_date: newSubDueDate || undefined,
      timing: newSubTiming || undefined,
      tag: newSubTag,
      assignee_id: newSubAssignee || undefined,
      sort_order: localProject.subtasks.length,
    }

    const result = await addSubtask(localProject.id, input)
    setSubmitting(false)

    if (result) {
      setLocalProject(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, result],
      }))
      // Reset form
      setNewSubTitle('')
      setNewSubDesc('')
      setNewSubDueDate('')
      setNewSubTiming('')
      setNewSubTag(null)
      setNewSubAssignee('')
      setShowAddSubtask(false)
      onUpdated()
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Delete this subtask?')) return
    const ok = await deleteSubtask(subtaskId)
    if (ok) {
      setLocalProject(prev => ({
        ...prev,
        subtasks: prev.subtasks.filter(s => s.id !== subtaskId),
      }))
      setSelectedSubtask(null)
      onUpdated()
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm('Delete this entire project and all its subtasks?')) return
    const ok = await deleteProject(localProject.id)
    if (ok) {
      onUpdated()
      onClose()
    }
  }

  const completedCount = localProject.subtasks.filter(
    s => s.status === 'done' || s.status === 'checked'
  ).length
  const totalCount = localProject.subtasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ListOrdered size={16} className="text-mps-blue-600" />
                <span className="font-medium">Project</span>
              </div>
              {progress > 0 && (
                <span className="text-xs font-medium text-slate-500">
                  {progress}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={handleDeleteProject}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Title */}
            <div>
              {editingTitle && canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                    className="flex-1 text-xl font-bold text-slate-800 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
                    autoFocus
                  />
                  <button onClick={handleSaveTitle} className="p-1.5 text-mps-green-600 hover:bg-mps-green-50 rounded-lg">
                    <Check size={16} />
                  </button>
                  <button onClick={() => { setEditingTitle(false); setTitleDraft(localProject.title) }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-xl font-bold text-slate-800">{localProject.title}</h2>
                  {canEdit && (
                    <button
                      onClick={() => setEditingTitle(true)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition-opacity"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              {editingDesc && canEdit ? (
                <div className="space-y-2">
                  <textarea
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    rows={3}
                    className="w-full text-sm text-slate-600 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 resize-none"
                    placeholder="Project description..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveDesc} className="text-xs px-3 py-1.5 bg-mps-blue-500 text-white rounded-lg hover:bg-mps-blue-600">
                      Save
                    </button>
                    <button onClick={() => { setEditingDesc(false); setDescDraft(localProject.description || '') }} className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  {localProject.description ? (
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {localProject.description}
                      {canEdit && (
                        <button
                          onClick={() => setEditingDesc(true)}
                          className="inline-block ml-2 opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-opacity"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </p>
                  ) : canEdit ? (
                    <button
                      onClick={() => setEditingDesc(true)}
                      className="text-sm text-slate-400 hover:text-slate-600"
                    >
                      + Add description
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Dates & Sequential Mode */}
            <div className="flex flex-wrap gap-3">
              {editingDates && canEdit ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-500" />
                    <input
                      type="date"
                      value={startDateDraft}
                      onChange={e => setStartDateDraft(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
                    />
                    <span className="text-slate-400 text-sm">to</span>
                    <input
                      type="date"
                      value={endDateDraft}
                      onChange={e => setEndDateDraft(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
                    />
                  </div>
                  <button onClick={handleSaveDates} className="p-1.5 text-mps-green-600 hover:bg-mps-green-50 rounded-lg">
                    <Check size={14} />
                  </button>
                  <button onClick={() => { setEditingDates(false); setStartDateDraft(localProject.start_date || ''); setEndDateDraft(localProject.end_date || '') }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  {(localProject.start_date || localProject.end_date) && (
                    <button
                      onClick={() => canEdit && setEditingDates(true)}
                      className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Calendar size={14} />
                      <span>
                        {localProject.start_date || '?'} - {localProject.end_date || '?'}
                      </span>
                    </button>
                  )}
                  {!localProject.start_date && !localProject.end_date && canEdit && (
                    <button
                      onClick={() => setEditingDates(true)}
                      className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      <Calendar size={14} /> + Add dates
                    </button>
                  )}
                </>
              )}

              {/* Sequential mode toggle */}
              <button
                onClick={() => canEdit && handleToggleSequential()}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  localProject.sequential_mode
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
                disabled={!canEdit}
              >
                <ListOrdered size={14} />
                Sequential {localProject.sequential_mode ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span>{completedCount}/{totalCount} subtasks ({progress}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-mps-blue-500 to-mps-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Members */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users size={14} />
                Members ({localProject.members.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {localProject.members.map(m => (
                  <span
                    key={m.id}
                    className="flex items-center gap-1.5 text-xs bg-mps-blue-50 text-mps-blue-700 px-2.5 py-1 rounded-full font-medium"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[9px] font-bold">
                        {m.user?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    {m.user?.full_name || 'Unknown'}
                  </span>
                ))}
              </div>
            </div>

            {/* Sequential mode tooltip */}
            <AnimatePresence>
              {sequentialTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-xl"
                >
                  <AlertCircle size={16} />
                  {sequentialTooltip}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText size={14} />
                  Subtasks ({totalCount})
                </h4>
                {canEdit && (
                  <button
                    onClick={() => setShowAddSubtask(!showAddSubtask)}
                    className="text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {localProject.subtasks.map((subtask, index) => (
                  <motion.div
                    key={subtask.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="glass rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedSubtask(subtask)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSubtaskStatusTap(subtask) }}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all active:scale-95 hover:shadow-md ${STATUS_COLORS[subtask.status]}`}
                        title={`${STATUS_LABELS[subtask.status]} - tap to change`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[subtask.status]}`} />
                        {STATUS_LABELS[subtask.status]}
                      </button>

                      {/* Subtask info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${
                          subtask.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}>
                          {localProject.sequential_mode && (
                            <span className="text-xs text-slate-400 mr-1.5">#{index + 1}</span>
                          )}
                          {subtask.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {subtask.assignee && (
                            <span className="text-xs text-slate-500">
                              {subtask.assignee.full_name}
                            </span>
                          )}
                          {subtask.due_date && (
                            <span className="text-xs text-slate-500 flex items-center gap-0.5">
                              <Calendar size={10} /> {subtask.due_date}
                            </span>
                          )}
                          {subtask.timing && (
                            <span className="text-xs text-slate-500 flex items-center gap-0.5">
                              <Clock size={10} /> {subtask.timing}
                            </span>
                          )}
                          {subtask.tag === 'bonus' && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-0.5">
                              <Star size={8} /> Bonus
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}

                {totalCount === 0 && (
                  <div className="text-center py-6 text-sm text-slate-400">
                    No subtasks yet.{' '}
                    {canEdit && (
                      <button
                        onClick={() => setShowAddSubtask(true)}
                        className="text-mps-blue-600 hover:text-mps-blue-700 font-medium"
                      >
                        Add one
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Add Subtask Form */}
            <AnimatePresence>
              {showAddSubtask && canEdit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddSubtask} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h5 className="text-sm font-semibold text-slate-700">New Subtask</h5>

                    <input
                      type="text"
                      value={newSubTitle}
                      onChange={e => setNewSubTitle(e.target.value)}
                      placeholder="Subtask title *"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                      required
                      autoFocus
                    />

                    <textarea
                      value={newSubDesc}
                      onChange={e => setNewSubDesc(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 resize-none"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Assignee</label>
                        <select
                          value={newSubAssignee}
                          onChange={e => setNewSubAssignee(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                        >
                          <option value="">Unassigned</option>
                          {localProject.members.map(m => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.user?.full_name || 'Unknown'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                        <input
                          type="date"
                          value={newSubDueDate}
                          onChange={e => setNewSubDueDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Timing</label>
                        <input
                          type="time"
                          value={newSubTiming}
                          onChange={e => setNewSubTiming(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Tag</label>
                        <select
                          value={newSubTag || ''}
                          onChange={e => setNewSubTag(e.target.value === 'bonus' ? 'bonus' : null)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                        >
                          <option value="">No tag</option>
                          <option value="bonus">Bonus</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={submitting || !newSubTitle.trim()}
                        className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {submitting ? 'Adding...' : 'Add Subtask'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSubtask(false)}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  // Subtask detail modal
  const subtaskModal = selectedSubtask && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { e.stopPropagation(); setSelectedSubtask(null) }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtask Header */}
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSubtaskStatusTap(selectedSubtask)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 hover:shadow-lg ${STATUS_COLORS[selectedSubtask.status]}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full ${STATUS_DOT_COLORS[selectedSubtask.status]} animate-pulse`} />
                {STATUS_LABELS[selectedSubtask.status]}
                <ChevronRight size={14} className="opacity-50" />
              </button>
              {selectedSubtask.tag === 'bonus' && (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1">
                  <Star size={10} /> Bonus
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={() => handleDeleteSubtask(selectedSubtask.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setSelectedSubtask(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Subtask Body */}
          <div className="p-5 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">{selectedSubtask.title}</h2>

            {selectedSubtask.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{selectedSubtask.description}</p>
            )}

            <div className="flex flex-wrap gap-3">
              {selectedSubtask.due_date && (
                <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                  <Calendar size={14} />
                  <span>{selectedSubtask.due_date}</span>
                </div>
              )}
              {selectedSubtask.timing && (
                <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                  <Clock size={14} />
                  <span>{selectedSubtask.timing}</span>
                </div>
              )}
            </div>

            {selectedSubtask.assignee && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Assignee</h4>
                <span className="flex items-center gap-1.5 text-xs bg-mps-blue-50 text-mps-blue-700 px-2.5 py-1 rounded-full font-medium w-fit">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[9px] font-bold">
                      {selectedSubtask.assignee.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  {selectedSubtask.assignee.full_name}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null

  return (
    <>
      {createPortal(modal, document.body)}
      {selectedSubtask && createPortal(subtaskModal, document.body)}
    </>
  )
}
