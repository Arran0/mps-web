'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  GraduationCap,
  Users,
  Check,
} from 'lucide-react'
import { createAnnouncement } from '@/lib/announcements'
import { UserRole, UserProfile } from '@/lib/supabase'

interface NewAnnouncementFormProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  currentUserId: string
  currentUserRole: UserRole
  type: 'student' | 'staff'
  userTeams?: { id: string; name: string }[]
  allTeams?: { id: string; name: string }[]
  availableTeamMembers?: UserProfile[]
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function NewAnnouncementForm({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
  currentUserRole,
  type,
  userTeams = [],
  allTeams = [],
}: NewAnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Student announcement state
  const [selectedGrades, setSelectedGrades] = useState<number[]>([])
  // Map of grade -> selected sections (or ['all'] for all sections)
  const [selectedSections, setSelectedSections] = useState<Record<number, string[]>>({})

  // Staff announcement state
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [allStaff, setAllStaff] = useState(false)

  const isCoordinator = currentUserRole === 'coordinator'
  const isPrincipalOrAdmin = currentUserRole === 'principal' || currentUserRole === 'admin'

  const availableTeams = isPrincipalOrAdmin ? allTeams : userTeams

  const resetForm = () => {
    setTitle('')
    setContent('')
    setSelectedGrades([])
    setSelectedSections({})
    setSelectedTeamIds([])
    setAllStaff(false)
  }

  const toggleGrade = (grade: number) => {
    setSelectedGrades(prev => {
      if (prev.includes(grade)) {
        // Remove grade and its sections
        const next = prev.filter(g => g !== grade)
        setSelectedSections(s => {
          const copy = { ...s }
          delete copy[grade]
          return copy
        })
        return next
      }
      return [...prev, grade].sort((a, b) => a - b)
    })
  }

  const toggleSection = (grade: number, section: string) => {
    setSelectedSections(prev => {
      const current = prev[grade] || []

      if (section === 'all') {
        // Toggle "All Sections"
        if (current.includes('all')) {
          return { ...prev, [grade]: [] }
        }
        return { ...prev, [grade]: ['all'] }
      }

      // If "All" is selected, remove it when selecting individual sections
      let next = current.filter(s => s !== 'all')

      if (next.includes(section)) {
        next = next.filter(s => s !== section)
      } else {
        next = [...next, section]
      }

      return { ...prev, [grade]: next }
    })
  }

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
  }

  const toggleAllStaff = () => {
    if (!allStaff) {
      setAllStaff(true)
      setSelectedTeamIds([])
    } else {
      setAllStaff(false)
    }
  }

  const buildAudiences = () => {
    const audiences: {
      grade?: number
      section?: string
      team_id?: string
      all_teams?: boolean
    }[] = []

    if (type === 'student') {
      for (const grade of selectedGrades) {
        const sections = selectedSections[grade] || []
        if (sections.length === 0 || sections.includes('all')) {
          // All sections for this grade (section omitted = null in DB)
          audiences.push({ grade })
        } else {
          for (const section of sections) {
            audiences.push({ grade, section })
          }
        }
      }
    } else {
      // Staff
      if (allStaff) {
        audiences.push({ all_teams: true })
      } else {
        for (const teamId of selectedTeamIds) {
          audiences.push({ team_id: teamId })
        }
      }
    }

    return audiences
  }

  const canSubmit = () => {
    if (!title.trim() || !content.trim()) return false
    if (type === 'student') {
      if (selectedGrades.length === 0) return false
      // Each grade must have at least "all" or specific sections
      for (const grade of selectedGrades) {
        const sections = selectedSections[grade] || []
        if (sections.length === 0) return false
      }
      return true
    }
    // Staff
    return allStaff || selectedTeamIds.length > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) return

    setSubmitting(true)
    const audiences = buildAudiences()

    try {
      await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        audiences,
      }, currentUserId)

      resetForm()
      onCreated()
      onClose()
    } catch (err) {
      console.error('Failed to create announcement:', err)
    }
    setSubmitting(false)
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
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {type === 'student' ? (
                  <GraduationCap size={20} className="text-mps-blue-600" />
                ) : (
                  <Users size={20} className="text-purple-600" />
                )}
                New {type === 'student' ? 'Student' : 'Staff'} Announcement
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
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                  required
                  autoFocus
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <FileText size={14} /> Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your announcement..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 resize-none"
                  required
                />
              </div>

              {/* Student-specific: Grade & Section selectors */}
              {type === 'student' && (
                <div className="space-y-3">
                  {/* Grade selector */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      <GraduationCap size={14} /> Target Grades <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {GRADES.map(grade => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => toggleGrade(grade)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedGrades.includes(grade)
                              ? 'bg-mps-blue-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Grade {grade}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section selector per selected grade */}
                  {selectedGrades.length > 0 && (
                    <div className="space-y-3 border border-slate-200 rounded-xl p-3">
                      {selectedGrades.map(grade => {
                        const sections = selectedSections[grade] || []
                        return (
                          <div key={grade}>
                            <p className="text-xs font-semibold text-slate-600 mb-1.5">
                              Grade {grade} - Sections
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleSection(grade, 'all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  sections.includes('all')
                                    ? 'bg-mps-green-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                All Sections
                              </button>
                              {SECTIONS.map(sec => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => toggleSection(grade, sec)}
                                  disabled={sections.includes('all')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    sections.includes(sec)
                                      ? 'bg-mps-blue-500 text-white shadow-sm'
                                      : sections.includes('all')
                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {sec}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Staff-specific: Team selector */}
              {type === 'staff' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <Users size={14} /> Target Audience <span className="text-red-500">*</span>
                  </label>

                  <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                    {/* All Staff option - only for principal/admin */}
                    {isPrincipalOrAdmin && (
                      <button
                        type="button"
                        onClick={toggleAllStaff}
                        className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-colors text-left text-sm ${
                          allStaff
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          allStaff
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-slate-300'
                        }`}>
                          {allStaff && <Check size={12} className="text-white" />}
                        </div>
                        <Users size={14} />
                        <span className="font-medium">All Staff</span>
                      </button>
                    )}

                    {/* Team checkboxes */}
                    {!allStaff && availableTeams.map(team => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => toggleTeam(team.id)}
                        className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-colors text-left text-sm ${
                          selectedTeamIds.includes(team.id)
                            ? 'bg-mps-blue-50 text-mps-blue-700 border border-mps-blue-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedTeamIds.includes(team.id)
                            ? 'bg-mps-blue-500 border-mps-blue-500'
                            : 'border-slate-300'
                        }`}>
                          {selectedTeamIds.includes(team.id) && <Check size={12} className="text-white" />}
                        </div>
                        <span>{team.name}</span>
                      </button>
                    ))}

                    {availableTeams.length === 0 && !isPrincipalOrAdmin && (
                      <p className="text-sm text-slate-400 text-center py-3">
                        No teams available
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !canSubmit()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
