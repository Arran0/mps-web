'use client'

import React, { useState, useEffect, useCallback } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Award, BookOpen, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  fetchClassroomsForUser,
  ClassroomWithDetails,
  fetchAssessments,
  ClassroomAssessment,
  fetchAssessmentMarks,
  AssessmentMark,
} from '@/lib/classrooms'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

interface GradeData {
  classroom: ClassroomWithDetails
  assessments: (ClassroomAssessment & { marks: AssessmentMark[] })[]
}

export default function GradesPage() {
  const { user, profile } = useAuth()
  const [gradeData, setGradeData] = useState<GradeData[]>([])
  const [loading, setLoading] = useState(true)
  const isStaff = profile ? isStaffRole(profile.role) : false

  const loadData = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    try {
      const rooms = await fetchClassroomsForUser(user.id, profile.role)
      const data: GradeData[] = []

      for (const room of rooms) {
        const assessments = await fetchAssessments(room.id)
        const mainAssessments = assessments.filter(a => a.tag === 'main')

        const assessmentsWithMarks = await Promise.all(
          mainAssessments.map(async (assessment) => {
            const marks = await fetchAssessmentMarks(assessment.id)
            return { ...assessment, marks }
          })
        )

        if (assessmentsWithMarks.length > 0) {
          data.push({ classroom: room, assessments: assessmentsWithMarks })
        }
      }

      setGradeData(data)
    } catch (err) {
      console.error('Failed to load grades:', err)
    }
    setLoading(false)
  }, [user, profile])

  useEffect(() => { loadData() }, [loadData])

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page-theme="academics">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="mb-8">
            <Link href="/academics" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
              <ArrowLeft size={16} /> Back to Academics
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600">
                <Award className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-800">Grades</h1>
                <p className="text-slate-500 text-sm">Main scoresheet results across all classrooms</p>
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <div className="spinner mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading grades...</p>
            </div>
          ) : gradeData.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <Award size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No grade data available yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {gradeData.map(({ classroom, assessments }) => (
                <motion.div key={classroom.id} variants={itemVariants}>
                  <div className="glass rounded-2xl overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-amber-600" />
                        <h3 className="font-semibold text-slate-800">{classroom.title}</h3>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left px-4 py-3 font-medium text-slate-600">Scoresheet</th>
                            <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                            {!isStaff && (
                              <>
                                <th className="text-center px-4 py-3 font-medium text-slate-600">Marks</th>
                                <th className="text-center px-4 py-3 font-medium text-slate-600">Max</th>
                                <th className="text-center px-4 py-3 font-medium text-slate-600">%</th>
                              </>
                            )}
                            {isStaff && (
                              <th className="text-center px-4 py-3 font-medium text-slate-600">Students Graded</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assessments.map((assessment) => {
                            const myMark = assessment.marks.find(m => m.student_id === user.id)
                            const percentage = myMark && myMark.marks != null ? Math.round((myMark.marks / myMark.max_marks) * 100) : null

                            return (
                              <tr key={assessment.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-800">{assessment.title}</p>
                                  {assessment.description && (
                                    <p className="text-xs text-slate-500">{assessment.description}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {assessment.date ? new Date(assessment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                                </td>
                                {!isStaff && (
                                  <>
                                    <td className="px-4 py-3 text-center font-semibold text-slate-800">
                                      {myMark?.marks != null ? myMark.marks : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-600">
                                      {myMark?.max_marks || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {percentage != null ? (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          percentage >= 80 ? 'bg-green-100 text-green-700' :
                                          percentage >= 60 ? 'bg-amber-100 text-amber-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>
                                          {percentage}%
                                        </span>
                                      ) : '-'}
                                    </td>
                                  </>
                                )}
                                {isStaff && (
                                  <td className="px-4 py-3 text-center text-slate-600">
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
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
