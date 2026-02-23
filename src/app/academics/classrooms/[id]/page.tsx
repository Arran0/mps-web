'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/lib/supabase'
import { fetchClassroomById, ClassroomWithDetails } from '@/lib/classrooms'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen,
  ArrowLeft,
  GraduationCap,
  FileText,
  ClipboardList,
  MessageSquare,
  Construction,
  Users,
  ShieldCheck,
} from 'lucide-react'

type TabId = 'coursework' | 'homework' | 'assessments' | 'discussion'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const TABS: Tab[] = [
  { id: 'coursework', label: 'Course Work', icon: <GraduationCap size={17} /> },
  { id: 'homework', label: 'Home Work', icon: <FileText size={17} /> },
  { id: 'assessments', label: 'Assessments', icon: <ClipboardList size={17} /> },
  { id: 'discussion', label: 'Discussion', icon: <MessageSquare size={17} /> },
]

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  coursework: 'Course materials, notes, and learning resources.',
  homework: 'Assignments and homework submissions.',
  assessments: 'Tests, quizzes, and evaluation scores.',
  discussion: 'Class discussions and Q&A threads.',
}

function UnderConstructionPanel({ tab }: { tab: Tab }) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 flex items-center justify-center mx-auto mb-5 shadow-sm">
        <Construction size={30} className="text-cyan-400" />
      </div>
      <h3 className="font-display text-lg font-bold text-slate-700 mb-1">Under Construction</h3>
      <p className="text-sm text-slate-400 max-w-xs mx-auto">
        {TAB_DESCRIPTIONS[tab.id]} This section will be available soon.
      </p>
    </div>
  )
}

export default function AcademicsClassroomPage() {
  const params = useParams()
  const classroomId = params.id as string
  const { user, profile } = useAuth()
  const [classroom, setClassroom] = useState<ClassroomWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('coursework')

  const isStaff = profile ? isStaffRole(profile.role) : false

  const loadClassroom = useCallback(async () => {
    setLoading(true)
    const data = await fetchClassroomById(classroomId)
    setClassroom(data)
    setLoading(false)
  }, [classroomId])

  useEffect(() => {
    loadClassroom()
  }, [loadClassroom])

  if (!user || !profile) return null

  const activeTabObj = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading classroom...</p>
          </div>
        ) : !classroom ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Classroom not found</p>
            <Link
              href="/academics"
              className="text-cyan-600 hover:text-cyan-700 text-sm mt-2 inline-block"
            >
              Back to Academics
            </Link>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {/* Back link */}
            <Link
              href="/academics"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
            >
              <ArrowLeft size={15} /> Back to Academics
            </Link>

            {/* Classroom header */}
            <div className="glass rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
                  <BookOpen size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-2xl font-bold text-slate-800 truncate">
                    {classroom.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                      {classroom.classroom_code}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Users size={13} /> {classroom.member_count ?? 0} members
                    </span>
                    {/* Role badge */}
                    <span
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        isStaff
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}
                    >
                      <ShieldCheck size={12} />
                      {isStaff ? 'Staff View' : 'Student View'}
                    </span>
                  </div>
                  {classroom.description && (
                    <p className="text-sm text-slate-500 mt-2">{classroom.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass rounded-2xl p-1.5 mb-6">
              <div className="flex gap-1 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <UnderConstructionPanel tab={activeTabObj} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </ProtectedLayout>
  )
}
