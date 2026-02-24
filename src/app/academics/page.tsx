'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, GraduationCap, CalendarDays, Award, ChevronDown } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/lib/supabase'
import {
  ClassroomWithDetails, fetchClassroomsForUser,
  fetchAssessments, ClassroomAssessment,
  fetchAssessmentMarks, AssessmentMark,
} from '@/lib/classrooms'
import SchoolWorkManager from '@/components/classrooms/SchoolWorkManager'

interface GradeData {
  classroom: ClassroomWithDetails
  assessments: (ClassroomAssessment & { marks: AssessmentMark[] })[]
}

export default function AcademicsPage() {
  const { user, profile } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Scores section
  const [scoresExpanded, setScoresExpanded] = useState(false)
  const [gradeData, setGradeData]           = useState<GradeData[]>([])
  const [gradesLoading, setGradesLoading]   = useState(false)
  const [gradesLoaded, setGradesLoaded]     = useState(false)

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
        const withMarks = await Promise.all(
          main.map(async a => ({ ...a, marks: await fetchAssessmentMarks(a.id) }))
        )
        if (withMarks.length > 0) data.push({ classroom: room, assessments: withMarks })
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page-theme="academics">
        <div className="mb-8">
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
        <section className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-cyan-600" />
            <h2 className="font-display text-xl font-bold text-slate-800">Classrooms</h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading classrooms…</p>
          ) : classrooms.length === 0 ? (
            <p className="text-sm text-slate-500">You are not enrolled in any classrooms yet.</p>
          ) : (
            <ul className="space-y-2">
              {classrooms.map(classroom => (
                <li key={classroom.id}>
                  <Link
                    href={`/classrooms/${classroom.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-slate-700 hover:border-cyan-300 hover:text-cyan-700 transition-colors"
                  >
                    <span className="font-medium">{classroom.title}</span>
                    <ChevronRight size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* School Work Manager — students only */}
        {isStudent && (
          <section className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={18} className="text-cyan-600" />
              <h2 className="font-display text-xl font-bold text-slate-800">School Work</h2>
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
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h2 className="font-display text-xl font-bold text-slate-800">Scores</h2>
              <span className="text-xs text-slate-400 font-normal ml-1">Main scoresheet results</span>
            </div>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform ${scoresExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {scoresExpanded && (
            <div className="border-t border-slate-100 p-6 pt-4">
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
                  {gradeData.map(({ classroom, assessments }) => (
                    <div key={classroom.id} className="rounded-xl overflow-hidden border border-slate-100">
                      <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center gap-2">
                        <BookOpen size={16} className="text-amber-600" />
                        <span className="font-semibold text-slate-800 text-sm">{classroom.title}</span>
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
                                <th className="text-center px-4 py-2.5 font-medium text-slate-600">Students Graded</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {assessments.map(assessment => {
                              const myMark    = assessment.marks.find(m => m.student_id === user.id)
                              const pct       = myMark && myMark.marks != null
                                ? Math.round((myMark.marks / myMark.max_marks) * 100)
                                : null
                              return (
                                <tr key={assessment.id} className="hover:bg-slate-50/50">
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
                                    <td className="px-4 py-2.5 text-center text-slate-600">
                                      {assessment.marks.filter(m => m.marks != null).length} / {assessment.marks.length}
                                    </td>
                                  )}
                                </tr>
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
