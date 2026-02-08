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
  Bus,
  Calendar,
  Award,
  FileText,
  GraduationCap,
  ArrowRight,
  Bell,
  Megaphone,
  CalendarDays,
  Users,
  LayoutDashboard
} from 'lucide-react'
import {
  AnnouncementWithDetails,
  fetchStudentAnnouncements,
  fetchStudentAnnouncementsForStaff,
} from '@/lib/announcements'

const quickLinks = [
  { label: 'Homework', href: '/academics/homework', icon: <FileText size={24} />, color: 'from-blue-400 to-blue-600' },
  { label: 'Coursework', href: '/academics/coursework', icon: <GraduationCap size={24} />, color: 'from-purple-400 to-purple-600' },
  { label: 'Grades', href: '/academics/grades', icon: <Award size={24} />, color: 'from-amber-400 to-amber-600' },
  { label: 'Fee Manager', href: '/more/fees', icon: <CreditCard size={24} />, color: 'from-emerald-400 to-emerald-600' },
  { label: 'School Bus', href: '/more/bus', icon: <Bus size={24} />, color: 'from-rose-400 to-rose-600' },
  { label: 'Leave Manager', href: '/more/leave', icon: <Calendar size={24} />, color: 'from-cyan-400 to-cyan-600' },
]

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
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>([])

  const loadAnnouncements = useCallback(async () => {
    if (!user || !profile) return
    try {
      if (profile.role === 'student') {
        if (profile.grade != null) {
          const data = await fetchStudentAnnouncements(profile.grade, profile.section || '')
          setAnnouncements(data.slice(0, 4))
        }
      } else {
        const data = await fetchStudentAnnouncementsForStaff()
        setAnnouncements(data.slice(0, 4))
      }
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

  // Staff/Teacher navigation buttons (links into Task Manager)
  // Note: Team Analytics removed for coordinator/principal as they already have 4 buttons
  // They can still access Team Analytics via Task Manager tabs
  const staffNavButtons = [
    { label: 'Announcements', href: '/announcements', icon: <Megaphone size={24} />, color: 'from-mps-blue-400 to-mps-blue-600', description: 'View school announcements' },
    { label: 'Task Manager', href: '/tasks', icon: <ClipboardList size={24} />, color: 'from-amber-400 to-orange-500', description: 'Manage and track your tasks' },
    { label: 'Weekly Task Calendar', href: '/tasks?tab=weekly', icon: <CalendarDays size={24} />, color: 'from-purple-400 to-purple-600', description: 'View weekly task calendar' },
    { label: 'Advanced Dashboard', href: '/tasks?tab=dashboard', icon: <LayoutDashboard size={24} />, color: 'from-cyan-400 to-cyan-600', description: 'Access advanced analytics' },
  ]

  // Admin navigation buttons
  const adminNavButtons = [
    { label: 'Announcements', href: '/announcements', icon: <Megaphone size={24} />, color: 'from-mps-blue-400 to-mps-blue-600', description: 'View and manage announcements' },
    { label: 'Team Analytics', href: '/tasks?tab=team', icon: <Users size={24} />, color: 'from-purple-400 to-purple-600', description: 'View team performance' },
    { label: 'Fee Manager', href: '/more/fees', icon: <CreditCard size={24} />, color: 'from-emerald-400 to-emerald-600', description: 'Manage student fees' },
    { label: 'Bus Manager', href: '/more/bus', icon: <Bus size={24} />, color: 'from-rose-400 to-rose-600', description: 'Manage bus routes and schedules' },
  ]

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="glass-strong rounded-3xl p-8 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-mps-blue-200/30 to-mps-green-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

              <div className="relative z-10">
                <p className="text-mps-blue-600 font-medium mb-2">{getGreeting()}</p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
                </h1>
                <p className="text-slate-500">
                  You&apos;re logged in as <span className="font-medium text-slate-700">{profile ? getRoleDisplayName(profile.role) : 'User'}</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Latest Announcements - Top of Page */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="text-mps-blue-600" size={20} />
                <h2 className="font-display text-xl font-bold text-slate-800">Latest Announcements</h2>
              </div>
              <Link href="/announcements" className="text-mps-blue-600 hover:text-mps-blue-700 text-sm font-medium flex items-center gap-1">
                View All <ArrowRight size={16} />
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
                      <span className="text-xs px-2 py-1 bg-mps-blue-50 text-mps-blue-600 rounded-full font-medium flex-shrink-0 ml-3 capitalize">
                        {announcement.type}
                      </span>
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

          {/* Admin Navigation Buttons */}
          {isAdmin && (
            <motion.div variants={itemVariants} className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <LayoutDashboard className="text-mps-blue-600" size={20} />
                <h2 className="font-display text-xl font-bold text-slate-800">Admin Dashboard</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {adminNavButtons.map((button, index) => (
                  <motion.div
                    key={button.label}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={button.href}>
                      <div className="glass rounded-2xl p-5 card-hover group h-full">
                        <div className={`w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br ${button.color} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                          {button.icon}
                        </div>
                        <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-mps-blue-600 transition-colors">
                          {button.label}
                        </h3>
                        <p className="text-sm text-slate-500">{button.description}</p>
                        <div className="mt-3 flex items-center text-mps-blue-600 text-sm font-medium">
                          <span>Open</span>
                          <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Staff/Teacher Navigation Buttons (Not Admin) */}
          {isStaff && !isAdmin && (
            <motion.div variants={itemVariants} className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="text-amber-600" size={20} />
                <h2 className="font-display text-xl font-bold text-slate-800">Task Manager Quick Access</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {staffNavButtons.map((button, index) => (
                  <motion.div
                    key={button.label}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={button.href}>
                      <div className="glass rounded-2xl p-5 card-hover group h-full">
                        <div className={`w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br ${button.color} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                          {button.icon}
                        </div>
                        <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-mps-blue-600 transition-colors">
                          {button.label}
                        </h3>
                        <p className="text-sm text-slate-500">{button.description}</p>
                        <div className="mt-3 flex items-center text-mps-blue-600 text-sm font-medium">
                          <span>Open</span>
                          <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quick Links Section (For all users) */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-slate-800">Quick Access</h2>
              <Link href="/academics" className="text-mps-blue-600 hover:text-mps-blue-700 text-sm font-medium flex items-center gap-1">
                View All <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickLinks.map((link, index) => (
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
