'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone,
  Plus,
  Bell,
  Users,
  GraduationCap,
} from 'lucide-react'
import AnnouncementCard from './AnnouncementCard'
import NewAnnouncementForm from './NewAnnouncementForm'
import {
  AnnouncementWithDetails,
  fetchStudentAnnouncements,
  fetchStudentAnnouncementsForStaff,
  fetchStaffAnnouncements,
} from '@/lib/announcements'
import { UserRole, UserProfile } from '@/lib/supabase'

interface AnnouncementsListProps {
  userId: string
  userRole: UserRole
  userGrade?: number
  userSection?: string
  userTeams?: { id: string; name: string }[]
  allTeams?: { id: string; name: string }[]
  availableTeamMembers?: UserProfile[]
  teamGradeRanges?: { teamId: string; grades: number[] }[]
}

type TabId = 'student' | 'staff'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function AnnouncementsList({
  userId,
  userRole,
  userGrade,
  userSection,
  userTeams = [],
  allTeams = [],
  availableTeamMembers = [],
  teamGradeRanges = [],
}: AnnouncementsListProps) {
  const [activeTab, setActiveTab] = useState<TabId>('student')
  const [studentAnnouncements, setStudentAnnouncements] = useState<AnnouncementWithDetails[]>([])
  const [staffAnnouncements, setStaffAnnouncements] = useState<AnnouncementWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)

  const isStudent = userRole === 'student'
  const isTeacher = userRole === 'teacher'
  const isCoordinator = userRole === 'coordinator'
  const isPrincipalOrAdmin = userRole === 'principal' || userRole === 'admin'

  // Determine permissions
  const canCreateStudent = isTeacher || isCoordinator || isPrincipalOrAdmin
  const canCreateStaff = isCoordinator || isPrincipalOrAdmin
  const canDeleteOwn = !isStudent // staff can delete their own announcements
  const showTabs = !isStudent

  const loadStudentAnnouncements = useCallback(async () => {
    try {
      if (isStudent) {
        if (userGrade != null) {
          const data = await fetchStudentAnnouncements(userGrade, userSection || '')
          setStudentAnnouncements(data)
        }
      } else {
        const data = await fetchStudentAnnouncementsForStaff()
        setStudentAnnouncements(data)
      }
    } catch (err) {
      console.error('Failed to load student announcements:', err)
    }
  }, [isStudent, userGrade, userSection])

  const loadStaffAnnouncements = useCallback(async () => {
    try {
      if (!isStudent) {
        const data = await fetchStaffAnnouncements(userId, userRole)
        setStaffAnnouncements(data)
      }
    } catch (err) {
      console.error('Failed to load staff announcements:', err)
    }
  }, [isStudent, userId, userRole])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      loadStudentAnnouncements(),
      !isStudent ? loadStaffAnnouncements() : Promise.resolve(),
    ])
    setLoading(false)
  }, [loadStudentAnnouncements, loadStaffAnnouncements, isStudent])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleDelete = (id: string) => {
    setStudentAnnouncements(prev => prev.filter(a => a.id !== id))
    setStaffAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const handleCreated = () => {
    loadAll()
  }

  const currentAnnouncements = activeTab === 'student'
    ? studentAnnouncements
    : staffAnnouncements

  const canCreate = canCreateStudent || canCreateStaff

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
          <Bell size={22} className="text-mps-blue-600" />
          Announcements
        </h2>
        {!isStudent && canCreate && (
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* Tabs - only for staff */}
      {showTabs && (
        <div className="glass rounded-2xl p-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'student'
                  ? 'bg-gradient-to-r from-mps-blue-500 to-mps-green-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <GraduationCap size={18} />
              <span>Student Announcements</span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'staff'
                  ? 'bg-gradient-to-r from-mps-blue-500 to-mps-green-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users size={18} />
              <span>Staff Announcements</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading announcements...</p>
          </div>
        ) : currentAnnouncements.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Megaphone size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {activeTab === 'student'
                ? 'No student announcements yet.'
                : 'No staff announcements yet.'}
            </p>
            {canCreate && (
              <button
                onClick={() => setShowNewForm(true)}
                className="mt-3 text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium"
              >
                Create the first announcement
              </button>
            )}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {currentAnnouncements.map(announcement => (
                <motion.div key={announcement.id} variants={itemVariants}>
                  <AnnouncementCard
                    announcement={announcement}
                    canDelete={canDeleteOwn && announcement.created_by === userId}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* New Announcement Form Modal */}
      <NewAnnouncementForm
        isOpen={showNewForm}
        onClose={() => setShowNewForm(false)}
        onCreated={handleCreated}
        currentUserId={userId}
        currentUserRole={userRole}
        userTeams={userTeams}
        allTeams={allTeams}
        teamGradeRanges={teamGradeRanges}
      />
    </div>
  )
}
