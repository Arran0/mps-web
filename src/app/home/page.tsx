'use client'

import React, { useState, useEffect, useCallback } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleDisplayName, isStaffRole, isAdminRole } from '@/lib/supabase'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ClipboardList,
  CreditCard,
  Calendar,
  GraduationCap,
  ArrowRight,
  Bell,
  Megaphone,
  CalendarDays,
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  BookOpen,
  ImageIcon,
  MessageSquare,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  AnnouncementWithDetails,
  fetchAnnouncementsForUser,
} from '@/lib/announcements'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface QuickButton {
  label: string
  href: string
  icon: React.ReactNode
  color: string
  description?: string
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const isStaff = profile ? isStaffRole(profile.role) : false
  const isAdmin = profile ? isAdminRole(profile.role) : false
  const isStudent = profile?.role === 'student'
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>([])
  const [welcomeBanner, setWelcomeBanner] = useState<string | null>(null)

  // Load welcome banner from site_settings
  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'welcome_banner').single()
      .then(({ data }) => { if (data?.value) setWelcomeBanner(data.value) })
  }, [])

  const handleBannerUpload = async (file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `site/welcome_banner_${Date.now()}_${safeName}`
    const { data, error } = await supabase.storage.from('classroom-files').upload(path, file, { upsert: true })
    if (error) { alert('Upload failed: ' + error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('classroom-files').getPublicUrl(data.path)
    await supabase.from('site_settings').upsert({ key: 'welcome_banner', value: publicUrl }, { onConflict: 'key' })
    setWelcomeBanner(publicUrl)
  }

  const loadAnnouncements = useCallback(async () => {
    if (!user || !profile) return
    try {
      const data = await fetchAnnouncementsForUser(
        user.id,
        profile.role,
        profile.grade ?? undefined,
        profile.section ?? undefined
      )
      setAnnouncements(data.slice(0, 5))
    } catch (err) {
      console.error('Failed to load announcements for home:', err)
    }
  }, [user, profile])

  useEffect(() => { loadAnnouncements() }, [loadAnnouncements])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Task Manager quick access (for all staff including admin)
  const taskManagerButtons: QuickButton[] = [
    { label: 'Weekly Calendar', href: '/tasks?tab=weekly', icon: <CalendarDays size={24} />, color: 'from-amber-400 to-orange-500', description: 'View weekly task calendar' },
    { label: 'Analytics', href: '/tasks?tab=analytics', icon: <BarChart3 size={24} />, color: 'from-purple-400 to-purple-600', description: 'View task analytics' },
    { label: 'Projects', href: '/tasks?tab=projects', icon: <FolderKanban size={24} />, color: 'from-cyan-400 to-cyan-600', description: 'Manage projects' },
    { label: 'Dashboard', href: '/tasks?tab=dashboard', icon: <LayoutDashboard size={24} />, color: 'from-emerald-400 to-emerald-600', description: 'Advanced dashboard' },
  ]

  // Student quick access
  const studentQuickAccess: QuickButton[] = [
    { label: 'Academics', href: '/academics', icon: <BookOpen size={24} />, color: 'from-purple-400 to-mps-blue-600' },
    { label: 'Student Leave', href: '/more/leave', icon: <Calendar size={24} />, color: 'from-cyan-400 to-cyan-600' },
    { label: 'Fee Manager', href: '/more/fees', icon: <CreditCard size={24} />, color: 'from-emerald-400 to-emerald-600' },
    { label: 'Feedback', href: '/more/feedback', icon: <MessageSquare size={24} />, color: 'from-orange-400 to-red-500' },
  ]

  // Teacher/Coordinator/Principal quick access
  const staffQuickAccess: QuickButton[] = [
    { label: 'Academics', href: '/academics', icon: <BookOpen size={24} />, color: 'from-purple-400 to-mps-blue-600' },
    { label: 'Student Leave', href: '/more/leave', icon: <Calendar size={24} />, color: 'from-cyan-400 to-cyan-600' },
    { label: 'Staff Leave', href: '/more/staff-leave', icon: <CalendarDays size={24} />, color: 'from-pink-400 to-pink-600' },
  ]

  // Admin quick access
  const adminQuickAccess: QuickButton[] = [
    { label: 'Fee Manager', href: '/more/fees', icon: <CreditCard size={24} />, color: 'from-emerald-400 to-emerald-600' },
    { label: 'Academics', href: '/academics', icon: <BookOpen size={24} />, color: 'from-purple-400 to-mps-blue-600' },
    { label: 'Student Leave', href: '/more/leave', icon: <Calendar size={24} />, color: 'from-cyan-400 to-cyan-600' },
    { label: 'Staff Leave', href: '/more/staff-leave', icon: <CalendarDays size={24} />, color: 'from-pink-400 to-pink-600' },
  ]

  const quickAccess = isAdmin ? adminQuickAccess : isStudent ? studentQuickAccess : staffQuickAccess

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-page-theme="home">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="glass-strong rounded-3xl relative overflow-hidden">
              {welcomeBanner && (
                <div className="h-36 sm:h-44 relative">
                  <img src={welcomeBanner} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                </div>
              )}
              {!welcomeBanner && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-mps-blue-200/30 to-mps-green-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              )}
              <div className={`relative z-10 p-8 ${welcomeBanner ? '-mt-16' : ''}`}>
                <p className="text-mps-blue-600 font-medium mb-2">{getGreeting()}</p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
                </h1>
                <p className="text-slate-500">
                  You&apos;re logged in as <span className="font-medium text-slate-700">{profile ? getRoleDisplayName(profile.role) : 'User'}</span>
                </p>
                {isAdmin && (
                  <label className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 font-medium cursor-pointer transition-colors">
                    <ImageIcon size={14} />
                    {welcomeBanner ? 'Change Banner' : 'Add Banner'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleBannerUpload(f)
                    }} />
                  </label>
                )}
              </div>
            </div>
          </motion.div>

          {/* Latest Announcements */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="text-mps-blue-600" size={20} />
                <h2 className="font-display text-xl font-bold text-slate-800">Latest Announcements</h2>
              </div>
              <Link href="/announcements" className="text-mps-blue-600 hover:text-mps-blue-700 text-sm font-medium flex items-center gap-1">
                More Announcements <ArrowRight size={16} />
              </Link>
            </div>

            <div className="glass rounded-2xl divide-y divide-slate-100">
              {announcements.length > 0 ? announcements.map((announcement) => (
                <Link key={announcement.id} href="/announcements">
                  <div className="p-4 hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800 mb-0.5">{announcement.title}</h4>
                        <p className="text-sm text-slate-500">{formatRelativeDate(announcement.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="p-6 text-center">
                  <Megaphone size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No announcements yet</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Task Manager Quick Access (Staff only) */}
          {isStaff && (
            <motion.div variants={itemVariants} className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="text-amber-600" size={20} />
                <h2 className="font-display text-xl font-bold text-slate-800">Task Manager</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {taskManagerButtons.map((button) => (
                  <motion.div
                    key={button.label}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={button.href}>
                      <div className="glass rounded-2xl p-5 card-hover group h-full">
                        <div className={`w-12 h-12 mb-3 rounded-xl bg-gradient-to-br ${button.color} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                          {button.icon}
                        </div>
                        <h3 className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-mps-blue-600 transition-colors">
                          {button.label}
                        </h3>
                        {button.description && (
                          <p className="text-xs text-slate-500">{button.description}</p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quick Access Section */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center mb-6">
              <h2 className="font-display text-xl font-bold text-slate-800">Quick Access</h2>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 ${quickAccess.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
              {quickAccess.map((link) => (
                <motion.div
                  key={link.label}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={link.href}>
                    <div className="glass rounded-2xl p-5 text-center card-hover group">
                      <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${link.color} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                        {link.icon}
                      </div>
                      <p className="font-medium text-slate-700 text-sm">{link.label}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
