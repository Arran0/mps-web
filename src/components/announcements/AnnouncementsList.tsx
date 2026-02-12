'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone,
  Plus,
  Bell,
} from 'lucide-react'
import AnnouncementCard from './AnnouncementCard'
import NewAnnouncementForm from './NewAnnouncementForm'
import {
  AnnouncementWithDetails,
  fetchAnnouncementsForUser,
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
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>([])
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

  const loadAnnouncements = useCallback(async () => {
    setLoading(true)
    console.log('[AnnouncementsList] Loading announcements for user:', { userId, userRole, userGrade, userSection })
    try {
      const data = await fetchAnnouncementsForUser(userId, userRole, userGrade, userSection)
      console.log('[AnnouncementsList] Received announcements:', data?.length || 0, 'items', data)
      setAnnouncements(data)
    } catch (err) {
      console.error('[AnnouncementsList] Failed to load announcements:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, userRole, userGrade, userSection])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleDelete = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const handleCreated = () => {
    loadAnnouncements()
  }

  const canCreate = canCreateStudent || canCreateStaff

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
          <Bell size={22} className="text-mps-blue-600" />
          {isPrincipalOrAdmin ? 'All Announcements' : 'Announcements'}
        </h2>
        {canCreate && (
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Megaphone size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No announcements yet.</p>
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
            {announcements.map(announcement => (
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
