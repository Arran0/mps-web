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
  CheckCircle
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
          {/* Profile Header Card - Clean Professional Design */}
          <motion.div variants={itemVariants} className="glass-strong rounded-3xl overflow-hidden mb-6 shadow-xl">
            {/* Clean Gradient Banner */}
            <div className="h-28 sm:h-32 bg-gradient-to-r from-mps-blue-600 via-mps-blue-500 to-mps-green-500 relative">
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
              {/* Logo watermark */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-15">
                <div className="w-20 h-20 rounded-full overflow-hidden">
                  <Image src="/logo.png" alt="MPS" width={80} height={80} className="object-cover" />
                </div>
              </div>
            </div>

            {/* Profile Info Section */}
            <div className="px-6 sm:px-8 pb-6">
              {/* Avatar - positioned to overlap banner */}
              <div className="flex items-end gap-5 -mt-10">
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-2xl">
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <button className="absolute -bottom-1 -right-1 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border border-slate-100">
                    <Camera size={14} className="text-slate-600" />
                  </button>
                </div>

                {/* Edit button - aligned with avatar */}
                <div className="flex-1 flex justify-end pb-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex items-center gap-2 text-sm py-2.5"
                  >
                    <Edit3 size={14} />
                    Edit Profile
                  </motion.button>
                </div>
              </div>

              {/* Name and Info - below avatar */}
              <div className="mt-4">
                <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">
                  {profile?.full_name || 'User'}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    profile ? getRoleBadgeColor(profile.role) : 'bg-slate-100 text-slate-600'
                  }`}>
                    {profile ? getRoleDisplayName(profile.role) : 'Loading...'}
                  </span>
                  <span className="text-slate-400">•</span>
                  <div className="flex items-center gap-1 text-mps-green-600 text-xs font-medium">
                    <CheckCircle size={12} />
                    <span>Verified</span>
                  </div>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 text-xs">
                    Since {profile?.created_at ? formatDate(profile.created_at) : '...'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <div className="glass rounded-2xl p-6 h-full">
                <h2 className="font-display text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-mps-blue-500 to-mps-blue-600 rounded-xl text-white shadow-lg">
                    <User size={18} />
                  </div>
                  Personal Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="p-5 bg-gradient-to-br from-mps-blue-50 to-blue-50 rounded-2xl border border-mps-blue-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-mps-blue-500" />
                      <p className="text-sm text-slate-500 font-medium">Full Name</p>
                    </div>
                    <p className="font-semibold text-slate-800 text-lg">{profile?.full_name || 'Not set'}</p>
                  </div>

                  {/* Email */}
                  <div className="p-5 bg-gradient-to-br from-mps-green-50 to-emerald-50 rounded-2xl border border-mps-green-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={16} className="text-mps-green-500" />
                      <p className="text-sm text-slate-500 font-medium">Email Address</p>
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{user?.email || 'Not set'}</p>
                  </div>

                  {/* Role */}
                  <div className="p-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={16} className="text-purple-500" />
                      <p className="text-sm text-slate-500 font-medium">Role</p>
                    </div>
                    <p className="font-semibold text-slate-800">{profile ? getRoleDisplayName(profile.role) : 'Not set'}</p>
                  </div>

                  {/* Member Since */}
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-amber-500" />
                      <p className="text-sm text-slate-500 font-medium">Member Since</p>
                    </div>
                    <p className="font-semibold text-slate-800">{profile?.created_at ? formatDate(profile.created_at) : 'Not available'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <div className="glass rounded-2xl p-6 h-full">
                <h2 className="font-display text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg">
                    <Settings size={18} />
                  </div>
                  Quick Actions
                </h2>

                <div className="space-y-3">
                  <motion.button
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-mps-blue-50 to-transparent hover:from-mps-blue-100 transition-all text-left border border-transparent hover:border-mps-blue-100"
                  >
                    <div className="p-2.5 bg-gradient-to-br from-mps-blue-500 to-mps-blue-600 rounded-xl text-white shadow">
                      <Bell size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Notifications</p>
                      <p className="text-xs text-slate-500">Manage your alerts</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-mps-green-50 to-transparent hover:from-mps-green-100 transition-all text-left border border-transparent hover:border-mps-green-100"
                  >
                    <div className="p-2.5 bg-gradient-to-br from-mps-green-500 to-mps-green-600 rounded-xl text-white shadow">
                      <Lock size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Security</p>
                      <p className="text-xs text-slate-500">Password & 2FA</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-transparent hover:from-purple-100 transition-all text-left border border-transparent hover:border-purple-100"
                  >
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow">
                      <Settings size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Preferences</p>
                      <p className="text-xs text-slate-500">App settings</p>
                    </div>
                  </motion.button>

                  <hr className="my-4 border-slate-200" />

                  <motion.button
                    onClick={signOut}
                    whileHover={{ x: 4 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-rose-50 to-transparent hover:from-rose-100 transition-all text-left border border-transparent hover:border-rose-100"
                  >
                    <div className="p-2.5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl text-white shadow">
                      <LogOut size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-rose-600 text-sm">Sign Out</p>
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
