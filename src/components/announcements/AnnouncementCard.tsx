'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2,
  GraduationCap,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { AnnouncementWithDetails, AnnouncementAttachment, deleteAnnouncement } from '@/lib/announcements'

interface AnnouncementCardProps {
  announcement: AnnouncementWithDetails
  canDelete: boolean
  onDelete: (id: string) => void
}

function formatRelativeDate(dateStr: string): string {
  const date   = new Date(dateStr)
  const now    = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffSec < 60)  return 'just now'
  if (diffMin < 60)  return `${diffMin}m ago`
  if (diffHrs < 24)  return `${diffHrs}h ago`
  if (diffDays < 7)  return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

interface AudienceBadge {
  label: string
  kind: 'student' | 'staff'
}

function getAudienceBadges(announcement: AnnouncementWithDetails): AudienceBadge[] {
  const badges: AudienceBadge[] = []
  const seen = new Set<string>()

  for (const aud of announcement.audiences) {
    // Student audience rows
    if (aud.all_students) {
      const key = 'all-students'
      if (!seen.has(key)) { seen.add(key); badges.push({ label: 'All Students', kind: 'student' }) }
    } else if (aud.grade != null) {
      const label = aud.section
        ? `Grade ${aud.grade} – ${aud.section}`
        : `Grade ${aud.grade} – All Sections`
      if (!seen.has(label)) { seen.add(label); badges.push({ label, kind: 'student' }) }
    }

    // Staff audience rows
    if (aud.all_teams) {
      const key = 'all-staff'
      if (!seen.has(key)) { seen.add(key); badges.push({ label: 'All Staff', kind: 'staff' }) }
    } else if (aud.team_id) {
      const label = aud.team?.name || aud.team_id
      if (!seen.has(label)) { seen.add(label); badges.push({ label, kind: 'staff' }) }
    }
  }

  return badges
}

export default function AnnouncementCard({
  announcement,
  canDelete,
  onDelete,
}: AnnouncementCardProps) {
  const [isExpanded,  setIsExpanded]  = useState(true)
  const [showAudience, setShowAudience] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting,    setDeleting]    = useState(false)

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

  // Type pill colours
  const typePillClasses: Record<string, string> = {
    student: 'bg-mps-blue-50 text-mps-blue-600',
    staff:   'bg-purple-50 text-purple-600',
    both:    'bg-amber-50 text-amber-600',
  }
  const typePillLabel: Record<string, string> = {
    student: 'Students',
    staff:   'Staff',
    both:    'Students & Staff',
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-mps-blue-200 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => setIsExpanded(prev => !prev)}
      >
        {/* Compact header */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          {/* Avatar + title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
              {announcement.creator?.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800 text-sm leading-snug truncate">
                  {announcement.title}
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${typePillClasses[announcement.type] || ''}`}>
                  {typePillLabel[announcement.type] || announcement.type}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-medium">{announcement.creator?.full_name || 'Unknown'}</span>
                <span>·</span>
                <span>{formatRelativeDate(announcement.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Delete + expand */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {canDelete && (
              <button
                onClick={e => { e.stopPropagation(); setShowConfirm(true) }}
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

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </p>

                {/* Attachments */}
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {announcement.attachments.map((att: AnnouncementAttachment, i: number) => (
                      <div key={i}>
                        {att.type === 'image' && (
                          <a href={att.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <img src={att.url} alt={att.name} className="max-h-64 rounded-xl border border-slate-200 object-contain" />
                          </a>
                        )}
                        {att.type === 'youtube' && (
                          <div className="rounded-xl overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                            <iframe
                              src={att.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                              className="w-full aspect-video"
                              allowFullScreen
                              title={att.name}
                            />
                          </div>
                        )}
                        {att.type === 'document' && (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            <FileText size={14} />
                            <span className="flex-1 truncate">{att.name}</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Audience badges */}
                {badges.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setShowAudience(prev => !prev) }}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2 transition-colors"
                    >
                      {showAudience ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {showAudience ? 'Hide audience' : 'Show audience'}
                    </button>

                    <AnimatePresence>
                      {showAudience && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1.5">
                            {badges.map((badge, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                                  badge.kind === 'student'
                                    ? 'bg-mps-blue-50 text-mps-blue-700'
                                    : 'bg-purple-50 text-purple-700'
                                }`}
                              >
                                {badge.kind === 'student'
                                  ? <GraduationCap size={11} />
                                  : <Users size={11} />
                                }
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete confirmation portal */}
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
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                    ) : (
                      <><Trash2 size={14} /> Delete</>
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
