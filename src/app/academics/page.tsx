'use client'

import React, { useState, useEffect, useCallback } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/lib/supabase'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  GraduationCap,
  BookOpen,
  Award,
  Users,
  ArrowRight,
  FileText,
  Calendar,
} from 'lucide-react'
import { fetchClassroomsForUser, ClassroomWithDetails, fetchAssessments, ClassroomAssessment } from '@/lib/classrooms'
import SchoolWorkCalendar from '@/components/academics/SchoolWorkCalendar'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function AcademicsPage() {
  const { user, profile } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([])
  const [mainScores, setMainScores] = useState<Record<string, ClassroomAssessment[]>>({})
  const [loading, setLoading] = useState(true)
  const isStaff = profile ? isStaffRole(profile.role) : false
  const isStudent = profile?.role === 'student'

  const loadData = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    try {
      const rooms = await fetchClassroomsForUser(user.id, profile.role)
      setClassrooms(rooms)

      // For staff: fetch main scoresheets for each classroom
      if (isStaff) {
        const scoresMap: Record<string, ClassroomAssessment[]> = {}
        await Promise.all(
          rooms.map(async (room) => {
            const assessments = await fetchAssessments(room.id)
            scoresMap[room.id] = assessments.filter(a => a.tag === 'main')
          })
        )
        setMainScores(scoresMap)
      }
    } catch (err) {
      console.error('Failed to load academics data:', err)
    }
    setLoading(false)
  }, [user, profile, isStaff])

  useEffect(() => { loadData() }, [loadData])

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page-theme="academics">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
                <GraduationCap className="text-white" size={24} />
              </div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Academics</h1>
            </div>
            <p className="text-slate-500 ml-14">
              {isStudent ? 'Track your schoolwork, grades, and classroom activities.' : 'Manage classrooms, scoresheets, and academic content.'}
            </p>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <div className="spinner mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          ) : (
            <>
              {/* Classrooms Section */}
              <motion.div variants={itemVariants} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={18} className="text-cyan-600" /> My Classrooms
                  </h2>
                  <Link href="/classrooms" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium flex items-center gap-1">
                    View All <ArrowRight size={16} />
                  </Link>
                </div>

                {classrooms.length === 0 ? (
                  <div className="glass rounded-2xl p-8 text-center">
                    <BookOpen size={36} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No classrooms found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classrooms.map((room) => (
                      <motion.div key={room.id} variants={itemVariants}>
                        <Link href={`/classrooms/${room.id}`}>
                          <div className="glass rounded-2xl p-5 card-hover group">
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white shadow-md">
                                <BookOpen size={18} />
                              </div>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Users size={12} /> {room.member_count || 0}
                              </span>
                            </div>
                            <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-cyan-600 transition-colors">{room.title}</h3>
                            {room.description && (
                              <p className="text-xs text-slate-500 line-clamp-2">{room.description}</p>
                            )}

                            {/* Main Scoresheets for staff */}
                            {isStaff && mainScores[room.id] && mainScores[room.id].length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs font-medium text-slate-500 mb-1.5">Main Scoresheets:</p>
                                <div className="space-y-1">
                                  {mainScores[room.id].slice(0, 3).map((score) => (
                                    <div key={score.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                                      <Award size={12} className="text-amber-500" />
                                      <span className="truncate">{score.title}</span>
                                    </div>
                                  ))}
                                  {mainScores[room.id].length > 3 && (
                                    <p className="text-xs text-slate-400">+{mainScores[room.id].length - 3} more</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Grades Quick Link */}
              <motion.div variants={itemVariants} className="mb-8">
                <Link href="/academics/grades">
                  <div className="glass rounded-2xl p-5 card-hover group flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg">
                      <Award size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Grades</h3>
                      <p className="text-sm text-slate-500">View academic performance and score reports</p>
                    </div>
                    <ArrowRight size={20} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>

              {/* School Work Calendar for Students */}
              {isStudent && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-cyan-600" />
                    <h2 className="font-display text-lg font-bold text-slate-800">School Work Manager</h2>
                  </div>
                  <SchoolWorkCalendar userId={user.id} classrooms={classrooms} />
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
