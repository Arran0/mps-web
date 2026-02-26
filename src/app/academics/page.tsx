'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, GraduationCap, CalendarDays, Award, ChevronDown, Users, Check, Loader2 } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole, UserProfile } from '@/lib/supabase'
import {
  ClassroomWithDetails, fetchClassroomsForUser,
  fetchAssessments, ClassroomAssessment,
  fetchAssessmentMarks, AssessmentMark,
  fetchStudentMembers, upsertAssessmentMark,
} from '@/lib/classrooms'
import SchoolWorkManager from '@/components/classrooms/SchoolWorkManager'

interface GradeData {
  classroom: ClassroomWithDetails
  assessments: (ClassroomAssessment & { marks: AssessmentMark[] })[]
  students: UserProfile[]
}

export default function AcademicsPage() {
  const { user, profile } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Scores section
  const [scoresExpanded, setScoresExpanded]   = useState(false)
  const [gradeData, setGradeData]             = useState<GradeData[]>([])
  const [gradesLoading, setGradesLoading]     = useState(false)
  const [gradesLoaded, setGradesLoaded]       = useState(false)
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null)

  const isStudent = profile?.role === 'student'
  const isStaff   = profile ? isStaffRole(profile.role) : false

  const loadClassrooms = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    try {
      const enrolled = await fetchClassroomsForUser(user.id, profile.role)
      setClassrooms(enrolled)
    } catch (error) {
      console.error('Failed to load classrooms:', error)
      setClassrooms([])
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  const loadGrades = useCallback(async () => {
    if (!user || !profile || gradesLoaded || gradesLoading) return
    setGradesLoading(true)
    try {
      const rooms = await fetchClassroomsForUser(user.id, profile.role)
      const data: GradeData[] = []
      for (const room of rooms) {
        const assessments = await fetchAssessments(room.id)
        const main = assessments.filter(a => a.tag === 'main')
        const [withMarks, studentMembers] = await Promise.all([
          Promise.all(main.map(async a => ({ ...a, marks: await fetchAssessmentMarks(a.id) }))),
          fetchStudentMembers(room.id),
        ])
        if (withMarks.length > 0) data.push({
          classroom: room,
          assessments: withMarks,
          students: studentMembers.map(m => m.user),
        })
      }
      setGradeData(data)
      setGradesLoaded(true)
    } catch (err) {
      console.error('Failed to load grades:', err)
    }
    setGradesLoading(false)
  }, [user, profile, gradesLoaded, gradesLoading])

  useEffect(() => {
    loadClassrooms()
  }, [loadClassrooms])

  // Lazy-load grades when section is first expanded
  useEffect(() => {
    if (scoresExpanded && !gradesLoaded) {
      loadGrades()
    }
  }, [scoresExpanded, gradesLoaded, loadGrades])

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-page-theme="academics">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500">
              <GraduationCap className="text-white" size={24} />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-800">Academics</h1>
          </div>
          <p className="text-slate-500 ml-14">
            {isStudent
              ? 'Your classrooms, school work and grades in one place.'
              : 'Access your classrooms and grade data in one place.'}
          </p>
        </div>

        {/* Classrooms */}
        <section className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-cyan-600" />
            <h2 className="font-semibold text-slate-700 text-sm">Classrooms</h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading classrooms…</p>
          ) : classrooms.length === 0 ? (
            <p className="text-sm text-slate-500">You are not enrolled in any classrooms yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {classrooms.map(classroom => (
                <Link
                  key={classroom.id}
                  href={`/classrooms/${classroom.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/50 hover:text-cyan-700 transition-colors"
                >
                  <span className="text-sm font-medium truncate">{classroom.title}</span>
                  <ChevronRight size={15} className="flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* School Work Manager — students only */}
        {isStudent && (
          <section className="glass rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} className="text-cyan-600" />
              <h2 className="font-semibold text-slate-700 text-sm">School Work</h2>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : (
              <SchoolWorkManager classrooms={classrooms} userId={user.id} />
            )}
          </section>
        )}

        {/* Scores — expandable */}
        <section className="glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setScoresExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <h2 className="font-semibold text-slate-700 text-sm">Scores</h2>
              <span className="text-xs text-slate-400 font-normal">· Main scoresheet results</span>
            </div>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform ${scoresExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {scoresExpanded && (
            <div className="border-t border-slate-100 px-4 py-3">
              {gradesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Loading scores…</p>
                </div>
              ) : gradeData.length === 0 ? (
                <div className="text-center py-8">
                  <Award size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No grade data available yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {gradeData.map(({ classroom, assessments, students }) => (
                    <div key={classroom.id} className="rounded-xl overflow-hidden border border-slate-100">
                      <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center gap-2">
                        <BookOpen size={16} className="text-amber-600" />
                        <span className="font-semibold text-slate-800 text-sm">{classroom.title}</span>
                        {isStaff && (
                          <span className="ml-auto text-xs text-amber-600 flex items-center gap-1">
                            <Users size={12} /> {students.length} students
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Scoresheet</th>
                              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
                              {isStudent && (
                                <>
                                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Marks</th>
                                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Max</th>
                                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">%</th>
                                </>
                              )}
                              {isStaff && (
                                <th className="text-center px-4 py-2.5 font-medium text-slate-600">Graded</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {assessments.map(assessment => {
                              const myMark = assessment.marks.find(m => m.student_id === user.id)
                              const pct    = myMark && myMark.marks != null
                                ? Math.round((myMark.marks / myMark.max_marks) * 100)
                                : null
                              const isExpanded = expandedAssessment === assessment.id

                              return (
                                <React.Fragment key={assessment.id}>
                                  <tr
                                    className={`border-t border-slate-100 hover:bg-slate-50/50 ${isStaff ? 'cursor-pointer' : ''}`}
                                    onClick={() => isStaff && setExpandedAssessment(isExpanded ? null : assessment.id)}
                                  >
                                    <td className="px-4 py-2.5">
                                      <p className="font-medium text-slate-800">{assessment.title}</p>
                                      {assessment.description && (
                                        <p className="text-xs text-slate-500">{assessment.description}</p>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600">
                                      {assessment.date
                                        ? new Date(assessment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : '-'}
                                    </td>
                                    {isStudent && (
                                      <>
                                        <td className="px-4 py-2.5 text-center font-semibold text-slate-800">
                                          {myMark?.marks != null ? myMark.marks : '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-slate-600">
                                          {myMark?.max_marks || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                          {pct != null ? (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                              pct >= 80 ? 'bg-green-100 text-green-700' :
                                              pct >= 60 ? 'bg-amber-100 text-amber-700' :
                                              'bg-red-100 text-red-700'
                                            }`}>
                                              {pct}%
                                            </span>
                                          ) : '-'}
                                        </td>
                                      </>
                                    )}
                                    {isStaff && (
                                      <td className="px-4 py-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <span className="text-slate-600">
                                            {assessment.marks.filter(m => m.marks != null).length} / {students.length}
                                          </span>
                                          <ChevronDown
                                            size={14}
                                            className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </div>
                                      </td>
                                    )}
                                  </tr>

                                  {/* Inline Marksheet Editor for staff */}
                                  {isStaff && isExpanded && (
                                    <tr>
                                      <td colSpan={3} className="p-0 border-t border-amber-100">
                                        <MarksheetEditor
                                          assessment={assessment}
                                          students={students}
                                        />
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </ProtectedLayout>
  )
}

// ─── Marksheet Editor ─────────────────────────────────────────────────────────

function MarksheetEditor({
  assessment,
  students,
}: {
  assessment: ClassroomAssessment & { marks: AssessmentMark[] }
  students: UserProfile[]
}) {
  const defaultMax = assessment.marks.length > 0 ? (assessment.marks[0].max_marks ?? 100) : 100
  const [maxMarks, setMaxMarks] = useState<number>(defaultMax)
  const [markValues, setMarkValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const m of assessment.marks) {
      if (m.marks != null) init[m.student_id] = String(m.marks)
    }
    return init
  })
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [saved, setSaved]   = useState<Set<string>>(new Set())

  const handleSave = async (studentId: string) => {
    const raw = markValues[studentId]
    const parsed = raw === '' || raw === undefined ? null : Number(raw)
    if (raw !== '' && raw !== undefined && isNaN(parsed!)) return
    setSaving(s => new Set([...s, studentId]))
    await upsertAssessmentMark(assessment.id, studentId, parsed, maxMarks)
    setSaving(s => { const n = new Set(s); n.delete(studentId); return n })
    setSaved(s => new Set([...s, studentId]))
    setTimeout(() => setSaved(s => { const n = new Set(s); n.delete(studentId); return n }), 2000)
  }

  return (
    <div className="bg-amber-50/40 p-4">
      {/* Max marks control */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold text-amber-700">Marksheet — {assessment.title}</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-slate-500">Out of</span>
          <input
            type="number"
            value={maxMarks}
            onChange={e => setMaxMarks(Number(e.target.value))}
            className="w-16 border border-amber-200 rounded-lg px-2 py-0.5 text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            min={1}
          />
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No students enrolled</p>
      ) : (
        <div className="space-y-1.5">
          {students.map(student => {
            const val = markValues[student.id] ?? ''
            const num = val !== '' ? Number(val) : null
            const pct = num != null && !isNaN(num) ? Math.round((num / maxMarks) * 100) : null

            return (
              <div key={student.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 border border-slate-100 shadow-sm">
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{student.full_name}</span>
                <input
                  type="number"
                  value={val}
                  onChange={e => setMarkValues(prev => ({ ...prev, [student.id]: e.target.value }))}
                  onBlur={() => handleSave(student.id)}
                  onKeyDown={e => e.key === 'Enter' && handleSave(student.id)}
                  placeholder="—"
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400/50 bg-white"
                  min={0}
                  max={maxMarks}
                />
                <span className="text-xs text-slate-400 w-8 text-center">/{maxMarks}</span>
                {pct != null ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-12 text-center ${
                    pct >= 80 ? 'bg-green-100 text-green-700' :
                    pct >= 60 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {pct}%
                  </span>
                ) : <span className="w-12" />}
                <span className="w-5 text-center">
                  {saving.has(student.id) ? (
                    <Loader2 size={12} className="animate-spin text-slate-400" />
                  ) : saved.has(student.id) ? (
                    <Check size={12} className="text-green-500" />
                  ) : null}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
