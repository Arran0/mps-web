'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { motion } from 'framer-motion'
import {
  Megaphone,
  Calendar,
  BookOpen,
  Users,
  Trophy,
  AlertCircle,
  Bell
} from 'lucide-react'

// Demo announcements data (under construction - will be connected to database)
const announcements = [
  {
    id: 1,
    title: 'Annual Sports Day Registration Open',
    content: 'Registration for the Annual Sports Day is now open. All students are encouraged to participate in various athletic events. Register through your class teacher before the deadline.',
    date: 'Today',
    type: 'Event',
    icon: <Trophy size={20} />,
    priority: 'normal',
  },
  {
    id: 2,
    title: 'Mid-term Exam Schedule Released',
    content: 'The mid-term examination schedule has been released. Please check the academic calendar for detailed timing and subjects. Preparation materials are available in the library.',
    date: 'Yesterday',
    type: 'Academic',
    icon: <BookOpen size={20} />,
    priority: 'high',
  },
  {
    id: 3,
    title: 'Parent-Teacher Meeting on Friday',
    content: 'A parent-teacher meeting is scheduled for this Friday at 3:00 PM. All parents are requested to attend and discuss their ward\'s progress with respective teachers.',
    date: '2 days ago',
    type: 'Meeting',
    icon: <Users size={20} />,
    priority: 'normal',
  },
  {
    id: 4,
    title: 'Library Hours Extended',
    content: 'The school library will now remain open until 6:00 PM on weekdays to support students during the examination period. Take advantage of the extended hours for your studies.',
    date: '3 days ago',
    type: 'Notice',
    icon: <Bell size={20} />,
    priority: 'normal',
  },
  {
    id: 5,
    title: 'Holiday Notice: Republic Day',
    content: 'The school will remain closed on 26th January for Republic Day celebrations. A flag hoisting ceremony will be held at 8:00 AM. All are welcome to attend.',
    date: '1 week ago',
    type: 'Holiday',
    icon: <Calendar size={20} />,
    priority: 'normal',
  },
]

const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
  Event: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
  Academic: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
  Meeting: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
  Notice: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-500' },
  Holiday: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  Urgent: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-500' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function AnnouncementsPage() {
  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-mps-blue-500 to-mps-green-500 rounded-xl shadow-lg">
                <Megaphone className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-800">Announcements</h1>
                <p className="text-slate-500 text-sm">Stay updated with the latest school news and events</p>
              </div>
            </div>
          </motion.div>

          {/* Under Construction Notice */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <p className="text-amber-700 text-sm">
                <span className="font-medium">Coming Soon:</span> Full announcement management with real-time updates. Currently showing demo content.
              </p>
            </div>
          </motion.div>

          {/* Announcements List */}
          <div className="space-y-4">
            {announcements.map((announcement, index) => {
              const colors = typeColors[announcement.type] || typeColors.Notice
              return (
                <motion.div
                  key={announcement.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  className="glass rounded-2xl overflow-hidden card-hover cursor-pointer"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl ${colors.bg} flex-shrink-0`}>
                        <span className={colors.icon}>{announcement.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-slate-800 text-lg">
                            {announcement.title}
                            {announcement.priority === 'high' && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium">
                                Important
                              </span>
                            )}
                          </h3>
                          <span className={`text-xs px-3 py-1 ${colors.bg} ${colors.text} rounded-full font-medium flex-shrink-0`}>
                            {announcement.type}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed mb-3">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Calendar size={14} />
                          <span>{announcement.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Footer Info */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              Showing {announcements.length} announcements
            </p>
          </motion.div>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
