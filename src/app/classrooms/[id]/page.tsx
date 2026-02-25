'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  ClipboardList,
  MessageSquare,
  ChevronLeft,
  Lock,
  Camera,
  ImageIcon,
} from 'lucide-react'
import {
  fetchClassroomById,
  ClassroomWithDetails,
  isClassroomClosed,
  uploadClassroomImage,
} from '@/lib/classrooms'
import { isStaffRole } from '@/lib/supabase'
import CourseWorkTab from '@/components/classrooms/CourseWorkTab'
import HomeworkTab from '@/components/classrooms/HomeworkTab'
import AssessmentsTab from '@/components/classrooms/AssessmentsTab'
import DiscussionTab from '@/components/classrooms/DiscussionTab'

type Tab = 'coursework' | 'homework' | 'assessments' | 'discussion'

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()

  const [classroom, setClassroom] = useState<ClassroomWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('coursework')

  const loadClassroom = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const data = await fetchClassroomById(id)
    setClassroom(data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadClassroom()
  }, [loadClassroom])

  if (!user || !profile) return null

  const closed = classroom ? isClassroomClosed(classroom) : false
  const canEditClassroom = profile ? isStaffRole(profile.role) : false

  const handleImageUpload = async (kind: 'banner' | 'logo', file: File) => {
    if (!classroom) return
    const url = await uploadClassroomImage(classroom.id, file, kind)
    if (url) {
      setClassroom(prev => prev ? { ...prev, [`${kind}_url`]: url } : prev)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'coursework', label: 'Course Work', icon: <FileText size={16} /> },
    { id: 'homework', label: 'Homework', icon: <BookOpen size={16} /> },
    { id: 'assessments', label: 'Assessments', icon: <ClipboardList size={16} /> },
    { id: 'discussion', label: 'Discussion', icon: <MessageSquare size={16} /> },
  ]

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {loading ? (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading classroom...</p>
          </div>
        ) : !classroom ? (
          <div className="glass rounded-2xl p-10 text-center">
            <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Classroom not found</p>
            <p className="text-sm text-slate-400 mt-1">You may not have access to this classroom.</p>
          </div>
        ) : (
          <>
            {/* Classroom Header with Banner */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl overflow-hidden mb-5"
            >
              {/* Banner */}
              <div className="relative h-32 sm:h-40 bg-gradient-to-br from-purple-400 via-mps-blue-500 to-cyan-500">
                {classroom.banner_url && (
                  <img src={classroom.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {canEditClassroom && !closed && (
                  <label className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-black/60 rounded-lg cursor-pointer transition-colors text-white/80 hover:text-white">
                    <ImageIcon size={16} />
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleImageUpload('banner', f)
                    }} />
                  </label>
                )}
              </div>

              <div className="px-6 pb-5 -mt-8 relative">
                <div className="flex items-end gap-4">
                  {/* Logo */}
                  <div className="relative group">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0 border-4 border-white ${closed ? 'bg-slate-400' : 'bg-gradient-to-br from-purple-400 to-mps-blue-500'} overflow-hidden`}>
                      {classroom.logo_url ? (
                        <img src={classroom.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : closed ? (
                        <Lock size={22} />
                      ) : (
                        classroom.title.charAt(0).toUpperCase()
                      )}
                    </div>
                    {canEditClassroom && !closed && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white">
                        <Camera size={16} />
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleImageUpload('logo', f)
                        }} />
                      </label>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-9">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-display text-2xl font-bold text-slate-800">{classroom.title}</h1>
                      {closed && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 font-medium flex items-center gap-1">
                          <Lock size={11} /> Closed
                        </span>
                      )}
                    </div>
                    {classroom.description && (
                      <p className="text-sm text-slate-500 mt-1">{classroom.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users size={13} /> {classroom.member_count || 0} members
                      </span>
                      {classroom.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {new Date(classroom.start_date).toLocaleDateString()}
                          {classroom.end_date && (
                            <> – {new Date(classroom.end_date).toLocaleDateString()}</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Closed notice */}
                {closed && (
                  <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                    <Lock size={15} />
                    This classroom has ended. Content is read-only.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-mps-blue-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'coursework' && (
                <CourseWorkTab
                  classroomId={classroom.id}
                  userId={user.id}
                  userRole={profile.role}
                  classroom={classroom}
                />
              )}
              {activeTab === 'homework' && (
                <HomeworkTab
                  classroomId={classroom.id}
                  userId={user.id}
                  userRole={profile.role}
                  classroom={classroom}
                />
              )}
              {activeTab === 'assessments' && (
                <AssessmentsTab
                  classroomId={classroom.id}
                  userId={user.id}
                  userRole={profile.role}
                  classroom={classroom}
                />
              )}
              {activeTab === 'discussion' && (
                <DiscussionTab
                  classroomId={classroom.id}
                  userId={user.id}
                  userRole={profile.role}
                />
              )}
            </motion.div>
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}
