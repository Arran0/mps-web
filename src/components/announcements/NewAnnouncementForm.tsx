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
  /** Teams the current coordinator belongs to (for coordinator audience) */
  userTeams?: { id: string; name: string }[]
  /** All teams in the school (for principal / admin audience) */
  allTeams?: { id: string; name: string }[]
  /** Maps team IDs to their grade range (used to limit coordinator's grade picker) */
  teamGradeRanges?: { teamId: string; grades: number[] }[]
}

const ALL_GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const SECTIONS   = ['A', 'B', 'C', 'D', 'E', 'F']

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Checkbox({ checked, className = '' }: { checked: boolean; className?: string }) {
  return (
    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
      checked ? 'bg-mps-blue-500 border-mps-blue-500' : 'border-slate-300'
    } ${className}`}>
      {checked && <Check size={12} className="text-white" />}
    </div>
  )
}

function SectionBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-mps-blue-500 text-white shadow-sm'
          : disabled
          ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewAnnouncementForm({
  isOpen,
  onClose,
  onCreated,
  currentUserId,
  currentUserRole,
  userTeams = [],
  allTeams  = [],
  teamGradeRanges = [],
}: NewAnnouncementFormProps) {
  // ── Permissions ──────────────────────────────────────────────────────────
  const isCoordinator      = currentUserRole === 'coordinator'
  const isPrincipalOrAdmin = currentUserRole === 'principal' || currentUserRole === 'admin'
  // All three roles (coordinator, principal, admin) can target both students and staff
  // but coordinator is limited to their own grade ranges and teams
  const useInclusivePicker = isCoordinator || isPrincipalOrAdmin

  // ── Form state ───────────────────────────────────────────────────────────
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // ── Audience type (coordinator: exclusive toggle; principal/admin: multi-select) ──
  // 'student' | 'staff' | 'both'  — for coordinator only 'student' or 'staff'
  const [audienceMode, setAudienceMode] = useState<'student' | 'staff'>('student')

  // Student audience state
  const [allStudents, setAllStudents]   = useState(false)
  const [selectedGrades, setSelectedGrades]     = useState<number[]>([])
  const [selectedSections, setSelectedSections] = useState<Record<number, string[]>>({})

  // Staff audience state
  const [allStaff, setAllStaff]                 = useState(false)
  const [selectedTeamIds, setSelectedTeamIds]   = useState<string[]>([])

  // For principal/admin: can include BOTH student and staff in one announcement
  const [includeStudents, setIncludeStudents] = useState(true)
  const [includeStaff, setIncludeStaff]       = useState(false)

  // ── Derived values ───────────────────────────────────────────────────────

  /** Grades available in the grade picker (coordinator is limited to their teams) */
  const availableGrades = useMemo(() => {
    if (isPrincipalOrAdmin) return ALL_GRADES
    if (teamGradeRanges.length === 0) return ALL_GRADES

    const userTeamIds = new Set(userTeams.map(t => t.id))
    const grades = new Set<number>()
    for (const range of teamGradeRanges) {
      if (userTeamIds.has(range.teamId)) {
        range.grades.forEach(g => grades.add(g))
      }
    }
    const result = Array.from(grades).sort((a, b) => a - b)
    return result.length > 0 ? result : ALL_GRADES
  }, [isPrincipalOrAdmin, teamGradeRanges, userTeams])

  /** Teams shown in the team picker */
  const availableTeams = isPrincipalOrAdmin ? allTeams : userTeams

  // ── Form reset ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle('')
    setContent('')
    setError(null)
    setAudienceMode('student')
    setAllStudents(false)
    setSelectedGrades([])
    setSelectedSections({})
    setAllStaff(false)
    setSelectedTeamIds([])
    setIncludeStudents(true)
    setIncludeStaff(false)
  }

  // ── Grade / section toggles ──────────────────────────────────────────────
  const toggleGrade = (grade: number) => {
    setSelectedGrades(prev => {
      if (prev.includes(grade)) {
        const next = prev.filter(g => g !== grade)
        setSelectedSections(s => { const c = { ...s }; delete c[grade]; return c })
        return next
      }
      return [...prev, grade].sort((a, b) => a - b)
    })
  }

  const toggleSection = (grade: number, section: string) => {
    setSelectedSections(prev => {
      const current = prev[grade] || []
      if (section === 'all') {
        return { ...prev, [grade]: current.includes('all') ? [] : ['all'] }
      }
      let next = current.filter(s => s !== 'all')
      next = next.includes(section) ? next.filter(s => s !== section) : [...next, section]
      return { ...prev, [grade]: next }
    })
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

  // ── Team toggles ─────────────────────────────────────────────────────────
  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
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

  // ── Audience mode switch (coordinator only) ───────────────────────────────
  const switchAudienceMode = (mode: 'student' | 'staff') => {
    setAudienceMode(mode)
    if (mode === 'student') { setAllStaff(false); setSelectedTeamIds([]) }
    else { setAllStudents(false); setSelectedGrades([]); setSelectedSections({}) }
  }

  // ── Build audience rows ──────────────────────────────────────────────────
  const buildStudentAudiences = () => {
    if (allStudents) return [{ all_students: true }]
    const rows: { grade: number; section?: string }[] = []
    for (const grade of selectedGrades) {
      const sections = selectedSections[grade] || []
      if (sections.includes('all') || sections.length === 0) {
        rows.push({ grade })
      } else {
        for (const sec of sections) rows.push({ grade, section: sec })
      }
    }
    return rows
  }

  const buildStaffAudiences = () => {
    if (allStaff) return [{ all_teams: true }]
    return selectedTeamIds.map(team_id => ({ team_id }))
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const studentAudienceValid = (): boolean => {
    if (allStudents) return true
    if (selectedGrades.length === 0) return false
    // Every selected grade must have at least one section chosen (or 'all')
    return selectedGrades.every(g => (selectedSections[g] || []).length > 0)
  }

  const staffAudienceValid = (): boolean => allStaff || selectedTeamIds.length > 0

  const canSubmit = (): boolean => {
    if (!title.trim() || !content.trim()) return false

    if (useInclusivePicker) {
      if (!includeStudents && !includeStaff) return false
      if (includeStudents && !studentAudienceValid()) return false
      if (includeStaff && !staffAudienceValid()) return false
      return true
    }

    // Fallback (shouldn't be reached but kept for safety)
    if (audienceMode === 'student') return studentAudienceValid()
    return staffAudienceValid()
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) return

    setSubmitting(true)
    setError(null)

    try {
      const audiences: Parameters<typeof createAnnouncement>[0]['audiences'] = []

      const wantStudents = useInclusivePicker ? includeStudents : audienceMode === 'student'
      const wantStaff    = useInclusivePicker ? includeStaff    : audienceMode === 'staff'

      if (wantStudents) audiences.push(...buildStudentAudiences())
      if (wantStaff)    audiences.push(...buildStaffAudiences())

      const result = await createAnnouncement(
        { title: title.trim(), content: content.trim(), audiences },
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

  // ── Render helpers ────────────────────────────────────────────────────────

  const StudentPicker = () => (
    <div className="border border-slate-200 rounded-xl p-3 space-y-3">
      {/* All Students — principal / admin only */}
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
          <Checkbox checked={allStudents} />
          <GraduationCap size={14} />
          <span className="font-medium">All Students</span>
        </button>
      )}

      {/* Grade picker */}
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

          {/* Section picker per grade */}
          {selectedGrades.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              {selectedGrades.map(grade => {
                const sections = selectedSections[grade] || []
                return (
                  <div key={grade}>
                    <p className="text-xs font-semibold text-slate-600 mb-1.5">
                      Grade {grade} — Sections
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <SectionBtn
                        label="All Sections"
                        active={sections.includes('all')}
                        onClick={() => toggleSection(grade, 'all')}
                      />
                      {SECTIONS.map(sec => (
                        <SectionBtn
                          key={sec}
                          label={sec}
                          active={sections.includes(sec)}
                          disabled={sections.includes('all')}
                          onClick={() => toggleSection(grade, sec)}
                        />
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
  )

  const StaffPicker = () => (
    <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
      {/* All Staff — principal / admin only */}
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
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            allStaff ? 'bg-purple-500 border-purple-500' : 'border-slate-300'
          }`}>
            {allStaff && <Check size={12} className="text-white" />}
          </div>
          <Users size={14} />
          <span className="font-medium">All Staff</span>
        </button>
      )}

      {/* Team list */}
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
          <Checkbox checked={selectedTeamIds.includes(team.id)} />
          <span>{team.name}</span>
        </button>
      ))}

      {availableTeams.length === 0 && !isPrincipalOrAdmin && (
        <p className="text-sm text-slate-400 text-center py-3">No teams available</p>
      )}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
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
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
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

              {/* ── Audience ── */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">Audience</label>

                  {/* ── All privileged staff: inclusive checkbox picker ── */}
                {useInclusivePicker && (
                  <div className="space-y-3">
                    {/* Students section */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeStudents(prev => !prev)
                          if (includeStudents) {
                            setAllStudents(false)
                            setSelectedGrades([])
                            setSelectedSections({})
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          includeStudents ? 'bg-mps-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          includeStudents ? 'bg-mps-blue-500 border-mps-blue-500' : 'border-slate-300'
                        }`}>
                          {includeStudents && <Check size={12} className="text-white" />}
                        </div>
                        <GraduationCap size={16} className={includeStudents ? 'text-mps-blue-600' : 'text-slate-400'} />
                        <span className={`text-sm font-semibold ${includeStudents ? 'text-mps-blue-700' : 'text-slate-600'}`}>
                          Students
                        </span>
                        {isCoordinator && availableGrades.length < 12 && (
                          <span className="ml-auto text-xs text-amber-600 font-normal">Limited to your team&apos;s grades</span>
                        )}
                      </button>

                      {includeStudents && (
                        <div className="p-3 pt-0 border-t border-slate-100">
                          <StudentPicker />
                        </div>
                      )}
                    </div>

                    {/* Staff section */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeStaff(prev => !prev)
                          if (includeStaff) { setAllStaff(false); setSelectedTeamIds([]) }
                        }}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          includeStaff ? 'bg-purple-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          includeStaff ? 'bg-purple-500 border-purple-500' : 'border-slate-300'
                        }`}>
                          {includeStaff && <Check size={12} className="text-white" />}
                        </div>
                        <Users size={16} className={includeStaff ? 'text-purple-600' : 'text-slate-400'} />
                        <span className={`text-sm font-semibold ${includeStaff ? 'text-purple-700' : 'text-slate-600'}`}>
                          Staff
                        </span>
                        {isCoordinator && availableTeams.length > 0 && (
                          <span className="ml-auto text-xs text-amber-600 font-normal">Limited to your team</span>
                        )}
                      </button>

                      {includeStaff && (
                        <div className="p-3 pt-0 border-t border-slate-100">
                          <StaffPicker />
                        </div>
                      )}
                    </div>

                    {!includeStudents && !includeStaff && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5">
                        <AlertCircle size={13} /> Select at least one audience group.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Error */}
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
