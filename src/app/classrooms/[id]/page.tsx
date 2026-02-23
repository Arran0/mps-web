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
  BarChart2,
  ChevronRight,
  Construction,
  Users,
} from 'lucide-react'
import { fetchClassroomsForUser, ClassroomWithDetails } from '@/lib/classrooms'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export default function AcademicsPage() {
  const { user, profile } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const isStaff = profile ? isStaffRole(profile.role) : false

  const loadData = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    try {
      const rooms = await fetchClassroomsForUser(user.id, profile.role)
      setClassrooms(rooms)
    } catch (err) {
      console.error('Failed to load academics data:', err)
    }
    setLoading(false)
  }, [user, profile])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">

          {/* Page Header */}
          <motion.div variants={itemVariants} className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-2.5 rounded-xl shadow-md"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}
              >
                <GraduationCap className="text-white" size={24} />
              </div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Academics</h1>
            </div>
            <p className="text-slate-500 ml-14">
              {isStaff
                ? 'Manage classrooms and academic activities.'
                : 'View your classrooms and academic progress.'}
            </p>
          </motion.div>

          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          ) : (
            <div className="space-y-10">

              {/* ── Classrooms Section ── */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={20} className="text-cyan-600" />
                  <h2 className="font-display text-xl font-bold text-slate-800">Classrooms</h2>
                </div>

                {classrooms.length === 0 ? (
                  <div className="glass rounded-2xl p-10 text-center">
                    <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No classrooms yet</p>
                    <p className="text-sm text-slate-400 mt-1">
                      You are not enrolled in any classrooms.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classrooms.map((room) => (
                      <motion.div key={room.id} variants={itemVariants}>
                        <Link href={`/academics/classrooms/${room.id}`}>
                          <div className="glass rounded-2xl px-5 py-4 flex items-center justify-between card-hover group transition-all duration-200">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
                                <BookOpen size={18} />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">
                                  {room.title}
                                </p>
                                {room.description && (
                                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                    {room.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                                <Users size={13} /> {room.member_count ?? 0}
                              </span>
                              <ChevronRight
                                size={18}
                                className="text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all"
                              />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* ── Scores Section ── */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={20} className="text-amber-500" />
                  <h2 className="font-display text-xl font-bold text-slate-800">Scores</h2>
                </div>

                <div className="glass rounded-2xl p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <Construction size={28} className="text-amber-400" />
                  </div>
                  <p className="font-semibold text-slate-700 text-lg">Under Construction</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Score reports and grade summaries are coming soon.
                  </p>
                </div>
              </motion.section>

            </div>
          )}
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
