'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleDisplayName, isStaffRole } from '@/lib/supabase'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Bus, 
  Calendar,
  Award,
  FileText,
  GraduationCap,
  ArrowRight,
  Bell,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react'

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

export default function HomePage() {
  const { profile } = useAuth()
  const isStaff = profile ? isStaffRole(profile.role) : false

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

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
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}! 👋
                </h1>
                <p className="text-slate-500">
                  You&apos;re logged in as <span className="font-medium text-slate-700">{profile ? getRoleDisplayName(profile.role) : 'User'}</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards (Staff Only) */}
          {isStaff && (
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Pending Tasks', value: '12', icon: <ClipboardList size={20} />, trend: '+3', color: 'text-mps-blue-600 bg-mps-blue-50' },
                { label: 'Active Students', value: '245', icon: <Users size={20} />, trend: '+8', color: 'text-mps-green-600 bg-mps-green-50' },
                { label: 'This Week', value: '8', icon: <TrendingUp size={20} />, trend: '+2', color: 'text-purple-600 bg-purple-50' },
                { label: 'Hours Today', value: '4.5', icon: <Clock size={20} />, trend: '', color: 'text-amber-600 bg-amber-50' },
              ].map((stat, index) => (
                <div key={stat.label} className="glass rounded-2xl p-5 card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${stat.color}`}>
                      {stat.icon}
                    </div>
                    {stat.trend && (
                      <span className="text-xs font-medium text-mps-green-600 bg-mps-green-50 px-2 py-1 rounded-full">
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Staff Task Manager Link */}
          {isStaff && (
            <motion.div variants={itemVariants} className="mb-8">
              <Link href="/tasks">
                <div className="glass rounded-2xl p-6 card-hover border-2 border-dashed border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 rounded-xl">
                        <ClipboardList className="text-amber-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          Task Manager
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Staff Only</span>
                        </h3>
                        <p className="text-sm text-slate-500">Manage and track your tasks and assignments</p>
                      </div>
                    </div>
                    <ArrowRight className="text-amber-500" size={20} />
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Quick Links Section */}
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

          {/* Announcements Section */}
          <motion.div variants={itemVariants} className="mt-8">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="text-mps-blue-600" size={20} />
              <h2 className="font-display text-xl font-bold text-slate-800">Recent Announcements</h2>
            </div>

            <div className="glass rounded-2xl divide-y divide-slate-100">
              {[
                { title: 'Annual Sports Day Registration Open', date: 'Today', type: 'Event' },
                { title: 'Mid-term Exam Schedule Released', date: 'Yesterday', type: 'Academic' },
                { title: 'Parent-Teacher Meeting on Friday', date: '2 days ago', type: 'Meeting' },
              ].map((announcement, index) => (
                <div key={index} className="p-5 hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-800 mb-1">{announcement.title}</h4>
                      <p className="text-sm text-slate-500">{announcement.date}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-mps-blue-50 text-mps-blue-600 rounded-full font-medium">
                      {announcement.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
