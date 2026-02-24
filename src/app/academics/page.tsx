'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, GraduationCap, CalendarDays } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { ClassroomWithDetails, fetchClassroomsForUser } from '@/lib/classrooms'
import SchoolWorkManager from '@/components/classrooms/SchoolWorkManager'

export default function AcademicsPage() {
  const { user, profile } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const isStudent = profile?.role === 'student'

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

  useEffect(() => {
    loadClassrooms()
  }, [loadClassrooms])

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
              ? 'Your classrooms and school work in one place.'
              : 'Access your classrooms in one place.'}
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
          <section className="glass rounded-2xl p-6">
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
      </div>
    </ProtectedLayout>
  )
}
