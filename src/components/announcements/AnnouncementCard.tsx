'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2,
  X,
  GraduationCap,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { AnnouncementWithDetails, deleteAnnouncement } from '@/lib/announcements'

interface AnnouncementCardProps {
  announcement: AnnouncementWithDetails
  canDelete: boolean
  onDelete: (id: string) => void
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getAudienceBadges(announcement: AnnouncementWithDetails): { label: string; type: 'student' | 'staff' }[] {
  const badges: { label: string; type: 'student' | 'staff' }[] = []

  for (const audience of announcement.audiences) {
    if (announcement.type === 'student') {
      if (audience.grade != null) {
        if (audience.section) {
          badges.push({ label: `Grade ${audience.grade} - ${audience.section}`, type: 'student' })
        } else {
          badges.push({ label: `Grade ${audience.grade} - All Sections`, type: 'student' })
        }
      }
    } else {
      // Staff announcement
      if (audience.all_teams) {
        badges.push({ label: 'All Staff', type: 'staff' })
      } else if (audience.team_id) {
        const teamName = audience.team?.name || audience.team_id
        badges.push({ label: teamName, type: 'staff' })
      }
    }
  }

  return badges
}

export default function AnnouncementCard({ announcement, canDelete, onDelete }: AnnouncementCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const badges = getAudienceBadges(announcement)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAnnouncement(announcement.id)
      setShowConfirm(false)
      onDelete(announcement.id)
    } catch (err) {
      console.error('Failed to delete announcement:', err)
    }
    setDeleting(false)
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="glass rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Compact Header (Always Visible) */}
        <div className="p-4 flex items-center justify-between gap-3">
          {/* Left: Announcer Avatar + Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {announcement.creator?.full_name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-sm leading-snug truncate">
                {announcement.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-medium">{announcement.creator?.full_name || 'Unknown'}</span>
                <span>•</span>
                <span>{formatRelativeDate(announcement.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Right: Expand + Delete */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowConfirm(true)
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete announcement"
              >
                <Trash2 size={15} />
              </button>
            )}
            <div className="p-1.5 text-slate-500">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                {/* Content */}
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </p>

                {/* Audience badges */}
                {badges.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">Audience:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {badges.map((badge, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            badge.type === 'student'
                              ? 'bg-mps-blue-50 text-mps-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {badge.type === 'student' ? (
                            <GraduationCap size={11} />
                          ) : (
                            <Users size={11} />
                          )}
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete confirmation modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => !deleting && setShowConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Delete Announcement</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-5">
                  Are you sure you want to delete &ldquo;{announcement.title}&rdquo;?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={deleting}
                    className="flex-1 btn-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
