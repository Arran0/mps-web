'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, Bell } from 'lucide-react'
import AnnouncementCard from './AnnouncementCard'
import NewAnnouncementForm from './NewAnnouncementForm'
import { AnnouncementWithDetails, fetchAnnouncementsForUser } from '@/lib/announcements'
import { UserRole } from '@/lib/supabase'

interface AnnouncementsListProps {
  userId: string
  userRole: UserRole
  userGrade?: number
  userSection?: string
  userTeams?: { id: string; name: string }[]
  allTeams?: { id: string; name: string }[]
  teamGradeRanges?: { teamId: string; grades: number[] }[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0 },
}

export default function AnnouncementsList({
  userId,
  userRole,
  userGrade,
  userSection,
  userTeams = [],
  allTeams  = [],
  teamGradeRanges = [],
}: AnnouncementsListProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)

  // Only coordinator / principal / admin can create announcements
  const canCreate = ['coordinator', 'principal', 'admin'].includes(userRole)
  // Creator (coordinator) can delete their own; principal/admin can delete any
  const canDeleteOwn = ['coordinator', 'principal', 'admin'].includes(userRole)

  const loadAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAnnouncementsForUser(userId, userRole, userGrade, userSection)
      setAnnouncements(data)
    } catch (err) {
      console.error('Failed to load announcements:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, userRole, userGrade, userSection])

  useEffect(() => { loadAnnouncements() }, [loadAnnouncements])

  const handleDelete = (id: string) => setAnnouncements(prev => prev.filter(a => a.id !== id))
  const handleCreated = () => loadAnnouncements()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
          <Bell size={22} className="text-mps-blue-600" />
          Announcements
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
                  canDelete={
                    canDeleteOwn && (
                      announcement.created_by === userId ||
                      userRole === 'principal' ||
                      userRole === 'admin'
                    )
                  }
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* New Announcement Modal */}
      {canCreate && (
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
      )}
    </div>
  )
}
