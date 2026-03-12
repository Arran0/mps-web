'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  FileText,
  Users,
  ListOrdered,
} from 'lucide-react'
import { createProject, NewProjectInput } from '@/lib/projects'
import { UserProfile } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

interface NewProjectFormProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: () => void
  currentUserId: string
  availableAssignees: UserProfile[]
}

export default function NewProjectForm({
  isOpen,
  onClose,
  onProjectCreated,
  currentUserId,
  availableAssignees,
}: NewProjectFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sequentialMode, setSequentialMode] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUserId])
  const [submitting, setSubmitting] = useState(false)

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      setSequentialMode(false)
      setSelectedMembers([currentUserId])
    }
  }, [isOpen, currentUserId])

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      // Don't allow removing the current user
      if (userId === currentUserId && prev.includes(userId)) return prev
      return prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    const input: NewProjectInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sequential_mode: sequentialMode,
      member_ids: selectedMembers,
    }

    const project = await createProject(input, currentUserId)
    setSubmitting(false)

    if (project) {
      onProjectCreated()
      onClose()
    }
  }

  const formContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
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
              <h2 className="text-lg font-bold text-slate-800">New Project</h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Project title"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <FileText size={14} /> Description
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Project description..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 resize-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Calendar size={14} /> Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Calendar size={14} /> End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                  />
                </div>
              </div>

              {/* Sequential Mode */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      sequentialMode ? 'bg-mps-blue-500' : 'bg-slate-200'
                    }`}
                    onClick={() => setSequentialMode(!sequentialMode)}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        sequentialMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ListOrdered size={14} className="text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Sequential Mode</span>
                  </div>
                </label>
                <p className="text-xs text-slate-400 mt-1 ml-14">
                  When enabled, subtasks must be completed in order.
                </p>
              </div>

              {/* Members */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                  <Users size={14} /> Members
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {/* Current user is always included */}
                  {availableAssignees.map(user => {
                    const isCurrentUser = user.id === currentUserId
                    const isSelected = selectedMembers.includes(user.id)

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleMember(user.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left text-sm ${
                          isSelected
                            ? 'bg-mps-blue-50 text-mps-blue-700 border border-mps-blue-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Avatar avatarUrl={user.avatar_url} name={user.full_name} size={24} />
                        <span>{user.full_name}</span>
                        {isCurrentUser && (
                          <span className="text-xs text-slate-400 ml-auto">You</span>
                        )}
                        {!isCurrentUser && (
                          <span className="text-xs text-slate-400 ml-auto">{user.role}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  You are always included as a member.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Project'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null

  return createPortal(formContent, document.body)
}
