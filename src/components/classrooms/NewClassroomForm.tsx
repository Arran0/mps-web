'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, AlertCircle } from 'lucide-react'
import { createClassroom, fetchCoordinators } from '@/lib/classrooms'
import { UserRole, UserProfile } from '@/lib/supabase'

interface NewClassroomFormProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  currentUserId: string
  currentUserRole: UserRole
}

export default function NewClassroomForm({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
  currentUserRole,
}: NewClassroomFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [classroomCode, setClassroomCode] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [coordinators, setCoordinators] = useState<UserProfile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPrincipalOrAdmin = ['principal', 'admin'].includes(currentUserRole)
  const isCoordinator = currentUserRole === 'coordinator'

  useEffect(() => {
    if (isOpen && isPrincipalOrAdmin) {
      fetchCoordinators().then(setCoordinators)
    }
  }, [isOpen, isPrincipalOrAdmin])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setClassroomCode('')
    setCoordinatorId('')
    setError(null)
  }

  const canSubmit = () => {
    return title.trim() && classroomCode.trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) return

    setSubmitting(true)
    setError(null)

    try {
      // For coordinators, they are their own coordinator
      const resolvedCoordinatorId = isCoordinator ? currentUserId : coordinatorId || undefined

      const result = await createClassroom(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          classroom_code: classroomCode.trim().toUpperCase(),
          coordinator_id: resolvedCoordinatorId,
        },
        currentUserId
      )

      if (!result) {
        setError('Failed to create classroom. The code may already be in use.')
        return
      }

      resetForm()
      onCreated()
      onClose()
    } catch (err) {
      console.error('Unexpected error creating classroom:', err)
      setError('Failed to create classroom. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={20} className="text-purple-600" />
                New Classroom
              </h2>
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
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Math - Grade 5A"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this classroom..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Classroom Code */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Classroom Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={classroomCode}
                  onChange={(e) => setClassroomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MATH5A"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Unique code for students to join this classroom</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Coordinator Selection */}
              {isPrincipalOrAdmin && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Responsible Coordinator
                  </label>
                  <select
                    value={coordinatorId}
                    onChange={(e) => setCoordinatorId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  >
                    <option value="">Select coordinator...</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isCoordinator && (
                <div className="text-sm text-slate-500 bg-purple-50 rounded-xl p-3">
                  You will be assigned as the responsible coordinator.
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !canSubmit()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Classroom'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
