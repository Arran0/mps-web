'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, BookOpen, ClipboardList, FileText, GraduationCap, MessageSquare } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { fetchClassroomById, ClassroomWithDetails } from '@/lib/classrooms'

type ClassroomSection = {
  id: 'coursework' | 'homework' | 'assessments' | 'discussion'
  title: string
  icon: React.ReactNode
}

const classroomSections: ClassroomSection[] = [
  { id: 'coursework', title: 'Course Work', icon: <GraduationCap size={18} /> },
  { id: 'homework', title: 'Home Work', icon: <FileText size={18} /> },
  { id: 'assessments', title: 'Assessments', icon: <ClipboardList size={18} /> },
  { id: 'discussion', title: 'Discussion', icon: <MessageSquare size={18} /> },
]

export default function ClassroomDetailPage() {
  const params = useParams()
  const classroomId = params.id as string
  const { user, profile } = useAuth()
  const [classroom, setClassroom] = useState<ClassroomWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const viewType = useMemo(() => {
    if (!profile) return null
    const staffRoles = ['teacher', 'coordinator', 'principal', 'admin']
    return staffRoles.includes(profile.role) ? 'Staff' : 'Student'
  }, [profile])

  const loadClassroom = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchClassroomById(classroomId)
      setClassroom(data)
    } catch (error) {
      console.error('Failed to load classroom:', error)
      setClassroom(null)
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => {
    loadClassroom()
  }, [loadClassroom])

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading classroom...</p>
          </div>
        ) : !classroom ? (
          <div className="text-center py-12">
            <BookOpen size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Classroom not found.</p>
            <Link href="/academics" className="text-cyan-600 text-sm mt-2 inline-block">
              Back to Academics
            </Link>
          </div>
        ) : (
          <>
            <Link href="/academics" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
              <ArrowLeft size={16} /> Back to Academics
            </Link>

            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-800">{classroom.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{viewType} view</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classroomSections.map((section) => (
                <div key={section.id} className="glass rounded-2xl p-5 border border-slate-200/80">
                  <div className="flex items-center gap-2 text-slate-800 mb-2">
                    {section.icon}
                    <h2 className="font-semibold">{section.title}</h2>
                  </div>
                  <p className="text-sm text-slate-500">Under construction.</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}
