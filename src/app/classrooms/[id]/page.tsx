'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, FileText, GraduationCap, ClipboardList, MessageSquare, Users, Plus, ArrowLeft, Settings, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { fetchClassroomById, ClassroomWithDetails, addMemberByEmail } from '@/lib/classrooms'
import CourseWorkTab from '@/components/classrooms/CourseWorkTab'
import HomeworkTab from '@/components/classrooms/HomeworkTab'
import AssessmentsTab from '@/components/classrooms/AssessmentsTab'
import DiscussionTab from '@/components/classrooms/DiscussionTab'
import StudentDashboard from '@/components/classrooms/StudentDashboard'
import { motion } from 'framer-motion'

type TabId = 'dashboard' | 'coursework' | 'homework' | 'assessments' | 'discussion'

export default function ClassroomDetailPage() {
  const params = useParams()
  const classroomId = params.id as string
  const { user, profile } = useAuth()
  const [classroom, setClassroom] = useState<ClassroomWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('coursework')
  const [showAddMember, setShowAddMember] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<'student' | 'teacher'>('student')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  const isStudent = profile?.role === 'student'
  const isStaff = profile && ['teacher', 'coordinator', 'principal', 'admin'].includes(profile.role)
  const canManageMembers = profile && ['coordinator', 'principal', 'admin'].includes(profile.role)

  const loadClassroom = useCallback(async () => {
    setLoading(true)
    const data = await fetchClassroomById(classroomId)
    setClassroom(data)
    setLoading(false)
  }, [classroomId])

  useEffect(() => {
    loadClassroom()
  }, [loadClassroom])

  // Students default to dashboard tab
  useEffect(() => {
    if (isStudent) {
      setActiveTab('dashboard')
    }
  }, [isStudent])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addEmail.trim()) return

    setAddError(null)
    setAddSuccess(false)

    const result = await addMemberByEmail(classroomId, addEmail.trim(), addRole)
    if (result.success) {
      setAddSuccess(true)
      setAddEmail('')
      loadClassroom()
      setTimeout(() => setAddSuccess(false), 3000)
    } else {
      setAddError(result.error || 'Failed to add member')
    }
  }

  if (!user || !profile) return null

  const staffTabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'coursework', label: 'Course Work', icon: <GraduationCap size={18} /> },
    { id: 'homework', label: 'Homework', icon: <FileText size={18} /> },
    { id: 'assessments', label: 'Assessments', icon: <ClipboardList size={18} /> },
    { id: 'discussion', label: 'Discussion', icon: <MessageSquare size={18} /> },
  ]

  const studentTabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BookOpen size={18} /> },
    { id: 'coursework', label: 'Course Work', icon: <GraduationCap size={18} /> },
    { id: 'homework', label: 'Homework', icon: <FileText size={18} /> },
    { id: 'assessments', label: 'Assessments', icon: <ClipboardList size={18} /> },
    { id: 'discussion', label: 'Discussion', icon: <MessageSquare size={18} /> },
  ]

  const tabs = isStudent ? studentTabs : staffTabs

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading classroom...</p>
          </div>
        ) : !classroom ? (
          <div className="text-center py-12">
            <BookOpen size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Classroom not found</p>
            <Link href="/classrooms" className="text-mps-blue-600 text-sm mt-2 inline-block">
              Back to Classrooms
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <Link
                href="/classrooms"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
              >
                <ArrowLeft size={16} /> Back to Classrooms
              </Link>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-400 to-mps-blue-500 rounded-xl shadow-lg">
                    <BookOpen className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold text-slate-800">{classroom.title}</h1>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{classroom.classroom_code}</span>
                      <span className="flex items-center gap-1"><Users size={14} /> {classroom.member_count} members</span>
                    </div>
                  </div>
                </div>
                {canManageMembers && (
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <UserPlus size={16} /> Add Member
                  </button>
                )}
              </div>
              {classroom.description && (
                <p className="text-sm text-slate-500 mt-2">{classroom.description}</p>
              )}
            </div>

            {/* Add Member Panel */}
            {showAddMember && canManageMembers && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="glass rounded-2xl p-4 mb-4"
              >
                <form onSubmit={handleAddMember} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Email Address</label>
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="user@school.edu"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as 'student' | 'teacher')}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary text-sm px-4 py-2">Add</button>
                </form>
                {addError && <p className="text-red-600 text-xs mt-2">{addError}</p>}
                {addSuccess && <p className="text-green-600 text-xs mt-2">Member added successfully!</p>}
              </motion.div>
            )}

            {/* Tabs */}
            <div className="glass rounded-2xl p-1.5 mb-6">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-500 to-mps-blue-500 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && isStudent && (
                <StudentDashboard classroomId={classroomId} userId={user.id} />
              )}
              {activeTab === 'coursework' && (
                <CourseWorkTab
                  classroomId={classroomId}
                  userId={user.id}
                  userRole={profile.role}
                  classroom={classroom}
                />
              )}
              {activeTab === 'homework' && (
                <HomeworkTab
                  classroomId={classroomId}
                  userId={user.id}
                  userRole={profile.role}
                  classroom={classroom}
                />
              )}
              {activeTab === 'assessments' && (
                <AssessmentsTab
                  classroomId={classroomId}
                  userId={user.id}
                  userRole={profile.role}
                  classroom={classroom}
                />
              )}
              {activeTab === 'discussion' && (
                <DiscussionTab
                  classroomId={classroomId}
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
