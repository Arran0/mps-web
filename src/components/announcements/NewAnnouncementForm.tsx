'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  GraduationCap,
  Users,
  Check,
  AlertCircle,
  Megaphone,
} from 'lucide-react'
import { createAnnouncement } from '@/lib/announcements'
import { UserRole } from '@/lib/supabase'

interface NewAnnouncementFormProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  currentUserId: string
  currentUserRole: UserRole
  userTeams?: { id: string; name: string }[]
  allTeams?: { id: string; name: string }[]
  teamGradeRanges?: { teamId: string; grades: number[] }[]
}

const ALL_GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function NewAnnouncementForm({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
  currentUserRole,
  userTeams = [],
  allTeams = [],
  teamGradeRanges = [],
}: NewAnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Audience type toggle: 'student' | 'staff' — only one at a time
  const [audienceType, setAudienceType] = useState<'student' | 'staff'>('student')

  // Student audience state
  const [allStudents, setAllStudents] = useState(false)
  const [selectedGrades, setSelectedGrades] = useState<number[]>([])
  const [selectedSections, setSelectedSections] = useState<Record<number, string[]>>({})

  // Staff audience state
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [allStaff, setAllStaff] = useState(false)

  const isTeacher = currentUserRole === 'teacher'
  const isCoordinator = currentUserRole === 'coordinator'
  const isPrincipalOrAdmin = currentUserRole === 'principal' || currentUserRole === 'admin'

  const canCreateStudent = isTeacher || isCoordinator || isPrincipalOrAdmin
  const canCreateStaff = isCoordinator || isPrincipalOrAdmin

  // Compute available grades based on role and team grade ranges
  const availableGrades = useMemo(() => {
    if (isPrincipalOrAdmin) return ALL_GRADES
    if (teamGradeRanges.length === 0) return ALL_GRADES

    const userTeamIds = new Set(userTeams.map(t => t.id))
    const grades = new Set<number>()
    for (const range of teamGradeRanges) {
      if (userTeamIds.has(range.teamId)) {
        for (const g of range.grades) grades.add(g)
      }
    }

    const result = Array.from(grades).sort((a, b) => a - b)
    return result.length > 0 ? result : ALL_GRADES
  }, [isPrincipalOrAdmin, teamGradeRanges, userTeams])

  const availableTeams = isPrincipalOrAdmin ? allTeams : userTeams

  const switchAudienceType = (type: 'student' | 'staff') => {
    setAudienceType(type)
    // Reset the other side
    if (type === 'student') {
      setSelectedTeamIds([])
      setAllStaff(false)
    } else {
      setAllStudents(false)
      setSelectedGrades([])
      setSelectedSections({})
    }
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setError(null)
    setAudienceType('student')
    setAllStudents(false)
    setSelectedGrades([])
    setSelectedSections({})
    setSelectedTeamIds([])
    setAllStaff(false)
  }

  const toggleGrade = (grade: number) => {
    setSelectedGrades(prev => {
      if (prev.includes(grade)) {
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
        if (current.includes('all')) {
          return { ...prev, [grade]: [] }
        }
        return { ...prev, [grade]: ['all'] }
      }

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

  const toggleAllStudents = () => {
    if (!allStudents) {
      setAllStudents(true)
      setSelectedGrades([])
      setSelectedSections({})
    } else {
      setAllStudents(false)
    }
  }

  const buildStudentAudiences = () => {
    if (!canCreateStudent) return []

    const audiences: { grade?: number; section?: string }[] = []

    if (allStudents) {
      for (const grade of ALL_GRADES) {
        audiences.push({ grade })
      }
      return audiences
    }

    for (const grade of selectedGrades) {
      const sections = selectedSections[grade] || []
      if (sections.includes('all')) {
        audiences.push({ grade })
      } else {
        for (const section of sections) {
          audiences.push({ grade, section })
        }
      }
    }

    return audiences
  }

  const buildStaffAudiences = () => {
    if (!canCreateStaff) return []

    if (allStaff) return [{ all_teams: true }]
    return selectedTeamIds.map(teamId => ({ team_id: teamId }))
  }

  const canSubmit = () => {
    if (!title.trim() || !content.trim()) return false

    if (audienceType === 'student') {
      if (!allStudents && selectedGrades.length === 0) return false
      // Each selected grade must have sections chosen
      if (!allStudents) {
        for (const grade of selectedGrades) {
          if ((selectedSections[grade] || []).length === 0) return false
        }
      }
      return true
    }

    // staff
    return allStaff || selectedTeamIds.length > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) return

    setSubmitting(true)
    setError(null)

    try {
      const audiences = audienceType === 'student'
        ? buildStudentAudiences()
        : buildStaffAudiences()

      const result = await createAnnouncement(
        {
          title: title.trim(),
          content: content.trim(),
          type: audienceType,
          audiences,
        },
        currentUserId
      )

      if (!result) {
        setError('Failed to create announcement. Please try again.')
        setSubmitting(false)
        return
      }

      resetForm()
      onCreated()
      onClose()
    } catch (err) {
      console.error('Unexpected error creating announcement:', err)
      setError('Failed to create announcement. Please try again.')
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
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Megaphone size={20} className="text-mps-blue-600" />
                New Announcement
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

              {/* Audience Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">
                  Audience
                </label>

                {/* Audience type toggle */}
                {canCreateStudent && canCreateStaff && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchAudienceType('student')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        audienceType === 'student'
                          ? 'bg-mps-blue-50 text-mps-blue-700 border-mps-blue-300'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <GraduationCap size={14} /> Students
                    </button>
                    <button
                      type="button"
                      onClick={() => switchAudienceType('staff')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        audienceType === 'staff'
                          ? 'bg-purple-50 text-purple-700 border-purple-300'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Users size={14} /> Staff
                    </button>
                  </div>
                )}

                {/* Student audience picker */}
                {audienceType === 'student' && canCreateStudent && (
                  <>
                    {isTeacher && availableGrades.length < 12 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>You can only announce to grades assigned to your teams</span>
                      </div>
                    )}

                    <div className="border border-slate-200 rounded-xl p-3 space-y-3">
                      {/* All Students option - principal/admin only */}
                      {isPrincipalOrAdmin && (
                        <button
                          type="button"
                          onClick={toggleAllStudents}
                          className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-colors text-left text-sm ${
                            allStudents
                              ? 'bg-mps-blue-50 text-mps-blue-700 border border-mps-blue-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            allStudents
                              ? 'bg-mps-blue-500 border-mps-blue-500'
                              : 'border-slate-300'
                          }`}>
                            {allStudents && <Check size={12} className="text-white" />}
                          </div>
                          <GraduationCap size={14} />
                          <span className="font-medium">All Students</span>
                        </button>
                      )}

                      {/* Grade selector */}
                      {!allStudents && (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">Select Grades</p>
                            <div className="flex flex-wrap gap-1.5">
                              {availableGrades.map(grade => (
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
                            <div className="space-y-3 border-t border-slate-100 pt-3">
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
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Staff audience picker */}
                {audienceType === 'staff' && canCreateStaff && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>Principals and Admins will automatically see all staff announcements</span>
                    </div>

                    {isCoordinator && availableTeams.length > 0 && availableTeams.length < allTeams.length && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>You can only announce to teachers in your teams</span>
                      </div>
                    )}

                    <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                      {/* All Staff option - principal/admin only */}
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
                  </>
                )}
              </div>

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
                {submitting ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
