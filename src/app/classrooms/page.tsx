'use client'

import React, { useState, useEffect, useCallback } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, Plus, Users, Calendar, Hash } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fetchClassroomsForUser, ClassroomWithDetails } from '@/lib/classrooms'
import NewClassroomForm from '@/components/classrooms/NewClassroomForm'

export default function ClassroomsPage() {
  const { user, profile } = useAuth()
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)

  const isStudent = profile?.role === 'student'
  const canCreate = profile && ['coordinator', 'principal', 'admin'].includes(profile.role)

  const loadClassrooms = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    const data = await fetchClassroomsForUser(user.id, profile.role)
    setClassrooms(data)
    setLoading(false)
  }, [user, profile])

  useEffect(() => {
    loadClassrooms()
  }, [loadClassrooms])

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-400 to-mps-blue-500 rounded-xl shadow-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Classrooms</h1>
              <p className="text-slate-500 text-sm">Your learning spaces</p>
            </div>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowNewForm(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> New Classroom
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading classrooms...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <BookOpen size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {isStudent ? 'You are not enrolled in any classrooms yet.' : 'No classrooms created yet.'}
            </p>
            {canCreate && (
              <button
                onClick={() => setShowNewForm(true)}
                className="mt-3 text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium"
              >
                Create the first classroom
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((classroom, i) => (
              <motion.div
                key={classroom.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/classrooms/${classroom.id}`}>
                  <div className="glass rounded-2xl p-5 hover:shadow-lg transition-all duration-200 group cursor-pointer border border-transparent hover:border-mps-blue-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-gradient-to-br from-purple-100 to-mps-blue-100 rounded-lg group-hover:from-purple-200 group-hover:to-mps-blue-200 transition-colors">
                        <BookOpen size={20} className="text-purple-600" />
                      </div>
                      <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded-lg text-slate-500">
                        {classroom.classroom_code}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-slate-800 text-lg mb-1 group-hover:text-mps-blue-700 transition-colors">
                      {classroom.title}
                    </h3>
                    {classroom.description && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{classroom.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users size={14} /> {classroom.member_count || 0} members
                      </span>
                      {classroom.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={14} /> {new Date(classroom.start_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* New Classroom Form */}
        <NewClassroomForm
          isOpen={showNewForm}
          onClose={() => setShowNewForm(false)}
          onCreated={loadClassrooms}
          currentUserId={user.id}
          currentUserRole={profile.role}
        />
      </div>
    </ProtectedLayout>
  )
}
