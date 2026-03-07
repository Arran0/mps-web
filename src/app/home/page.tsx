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
  Users,
  UserPlus,
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
  const taskManagerButtons = [
    { label: 'Weekly Calendar', href: '/tasks?tab=weekly', icon: <CalendarDays size={24} />, color: 'from-amber-400 to-orange-500' },
    { label: 'Analytics', href: '/tasks?tab=analytics', icon: <BarChart3 size={24} />, color: 'from-purple-400 to-purple-600' },
    { label: 'Projects', href: '/tasks?tab=projects', icon: <FolderKanban size={24} />, color: 'from-cyan-400 to-cyan-600' },
    { label: 'Dashboard', href: '/tasks?tab=dashboard', icon: <LayoutDashboard size={24} />, color: 'from-emerald-400 to-emerald-600' },
  ]

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
              <div className={`relative z-10 px-8 pt-6 pb-8 ${welcomeBanner ? 'mt-0' : ''}`}>
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
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="text-amber-600" size={18} />
                <h2 className="font-display text-xl font-bold text-slate-800">Task Manager</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {taskManagerButtons.map((button) => (
                  <Link key={button.label} href={button.href}>
                    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-sm transition-all group">
                      <div className={`w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br ${button.color} flex items-center justify-center text-white shadow-md`}>
                        {button.icon}
                      </div>
                      <span className="font-medium text-slate-700 text-sm group-hover:text-amber-600 transition-colors leading-tight">
                        {button.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* More Services Section */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center mb-4">
              <h2 className="font-display text-xl font-bold text-slate-800">More Services</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Student Leave - all users */}
              <Link href="/more/leave">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-cyan-200 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white shadow-md">
                    <Calendar size={20} />
                  </div>
                  <span className="font-medium text-slate-700 text-sm group-hover:text-cyan-600 transition-colors">Student Leave</span>
                </div>
              </Link>
              {/* Fee Manager - all users */}
              <Link href="/more/fees">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-md">
                    <CreditCard size={20} />
                  </div>
                  <span className="font-medium text-slate-700 text-sm group-hover:text-emerald-600 transition-colors">Fee Manager</span>
                </div>
              </Link>
              {/* Feedback - all users */}
              <Link href="/more/feedback">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <MessageSquare size={20} />
                  </div>
                  <span className="font-medium text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">Feedback</span>
                </div>
              </Link>
              {/* Staff Leave - staff only */}
              {isStaff && (
                <Link href="/more/staff-leave">
                  <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-purple-200 hover:shadow-sm transition-all group">
                    <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white shadow-md">
                      <CalendarDays size={20} />
                    </div>
                    <span className="font-medium text-slate-700 text-sm group-hover:text-purple-600 transition-colors">Staff Leave</span>
                  </div>
                </Link>
              )}
              {/* Admin-only services */}
              {isAdmin && (
                <>
                  <Link href="/more/classrooms">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-md">
                        <BookOpen size={20} />
                      </div>
                      <span className="font-medium text-slate-700 text-sm group-hover:text-blue-600 transition-colors">Classroom Management</span>
                    </div>
                  </Link>
                  <Link href="/more/teacher-teams">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-pink-200 hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white shadow-md">
                        <Users size={20} />
                      </div>
                      <span className="font-medium text-slate-700 text-sm group-hover:text-pink-600 transition-colors">Teacher Teams</span>
                    </div>
                  </Link>
                  <Link href="/more/profiles">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-red-200 hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white shadow-md">
                        <UserPlus size={20} />
                      </div>
                      <span className="font-medium text-slate-700 text-sm group-hover:text-red-600 transition-colors">Profile Manager</span>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
