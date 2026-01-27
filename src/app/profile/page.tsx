'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/supabase'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Mail,
  User,
  Shield,
  Calendar,
  Edit3,
  Camera,
  LogOut,
  Settings,
  Bell,
  Lock,
  Sparkles,
  Award,
  BookOpen
} from 'lucide-react'

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

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Profile Header Card */}
          <motion.div variants={itemVariants} className="rounded-3xl overflow-hidden mb-6 shadow-xl">
            {/* Colorful Banner with Pattern */}
            <div className="h-40 sm:h-48 bg-gradient-to-r from-mps-blue-500 via-purple-500 to-mps-green-500 relative overflow-hidden">
              {/* Animated pattern overlay */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-1/2 right-0 w-32 h-32 bg-white rounded-full translate-x-1/2" />
                <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white rounded-full translate-y-1/2" />
              </div>
              {/* School Logo watermark */}
              <div className="absolute right-6 top-6 opacity-20">
                <div className="w-20 h-20 rounded-full overflow-hidden">
                  <Image src="/logo.png" alt="MPS" width={80} height={80} className="object-cover" />
                </div>
              </div>
              {/* Welcome text */}
              <div className="absolute bottom-4 left-6 text-white">
                <p className="text-white/80 text-sm font-medium flex items-center gap-2">
                  <Sparkles size={16} />
                  Your Profile
                </p>
              </div>
            </div>

            {/* Profile Info */}
            <div className="bg-white px-6 sm:px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 relative z-10">
                {/* Avatar */}
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-mps-blue-400 via-purple-400 to-mps-green-400 p-1 shadow-2xl">
                    <div className="w-full h-full rounded-xl bg-white flex items-center justify-center text-4xl font-bold">
                      <span className="bg-gradient-to-br from-mps-blue-500 to-mps-green-500 bg-clip-text text-transparent">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <button className="absolute bottom-2 right-2 p-2.5 bg-gradient-to-br from-mps-blue-500 to-mps-green-500 rounded-full shadow-lg hover:shadow-xl transition-all text-white">
                    <Camera size={16} />
                  </button>
                </motion.div>

                {/* Name and Role */}
                <div className="flex-1 sm:pb-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                    {profile?.full_name || 'User'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-sm px-4 py-1.5 rounded-full font-medium shadow-sm ${
                      profile ? getRoleBadgeColor(profile.role) : 'bg-slate-100 text-slate-600'
                    }`}>
                      {profile ? getRoleDisplayName(profile.role) : 'Loading...'}
                    </span>
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Calendar size={14} />
                      Member since {profile?.created_at ? formatDate(profile.created_at) : '...'}
                    </span>
                  </div>
                </div>

                {/* Edit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary flex items-center gap-2 self-start sm:self-end"
                >
                  <Edit3 size={16} />
                  Edit Profile
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Days Active', value: '45', icon: <Calendar size={20} />, color: 'from-blue-400 to-blue-600' },
              { label: 'Courses', value: '6', icon: <BookOpen size={20} />, color: 'from-purple-400 to-purple-600' },
              { label: 'Achievements', value: '12', icon: <Award size={20} />, color: 'from-amber-400 to-orange-500' },
              { label: 'Level', value: 'Pro', icon: <Sparkles size={20} />, color: 'from-emerald-400 to-emerald-600' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="glass rounded-2xl p-4 text-center card-hover"
              >
                <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <div className="glass rounded-2xl p-6 h-full">
                <h2 className="font-display text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-mps-blue-400 to-mps-blue-600 rounded-lg text-white">
                    <User size={18} />
                  </div>
                  Personal Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <User size={16} className="text-mps-blue-500" />
                      <p className="text-sm text-slate-500">Full Name</p>
                    </div>
                    <p className="font-semibold text-slate-800 text-lg">{profile?.full_name || 'Not set'}</p>
                  </div>

                  {/* Email */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-green-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Mail size={16} className="text-mps-green-500" />
                      <p className="text-sm text-slate-500">Email Address</p>
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{user?.email || 'Not set'}</p>
                  </div>

                  {/* Role */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-purple-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield size={16} className="text-purple-500" />
                      <p className="text-sm text-slate-500">Role</p>
                    </div>
                    <p className="font-semibold text-slate-800">{profile ? getRoleDisplayName(profile.role) : 'Not set'}</p>
                  </div>

                  {/* Member Since */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-amber-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar size={16} className="text-amber-500" />
                      <p className="text-sm text-slate-500">Member Since</p>
                    </div>
                    <p className="font-semibold text-slate-800">{profile?.created_at ? formatDate(profile.created_at) : 'Not available'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <div className="glass rounded-2xl p-6 h-full">
                <h2 className="font-display text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg text-white">
                    <Settings size={18} />
                  </div>
                  Quick Actions
                </h2>

                <div className="space-y-3">
                  <motion.button
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-transparent hover:from-blue-100 transition-all text-left"
                  >
                    <div className="p-2 bg-gradient-to-br from-mps-blue-400 to-mps-blue-600 rounded-lg text-white shadow">
                      <Bell size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Notifications</p>
                      <p className="text-xs text-slate-500">Manage alerts</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-50 to-transparent hover:from-green-100 transition-all text-left"
                  >
                    <div className="p-2 bg-gradient-to-br from-mps-green-400 to-mps-green-600 rounded-lg text-white shadow">
                      <Lock size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Security</p>
                      <p className="text-xs text-slate-500">Password & 2FA</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-transparent hover:from-purple-100 transition-all text-left"
                  >
                    <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg text-white shadow">
                      <Settings size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Preferences</p>
                      <p className="text-xs text-slate-500">App settings</p>
                    </div>
                  </motion.button>

                  <hr className="my-4 border-slate-200" />

                  <motion.button
                    onClick={signOut}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-rose-50 to-transparent hover:from-rose-100 transition-all text-left"
                  >
                    <div className="p-2 bg-gradient-to-br from-rose-400 to-rose-600 rounded-lg text-white shadow">
                      <LogOut size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-rose-600 text-sm">Sign Out</p>
                      <p className="text-xs text-slate-500">End your session</p>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
