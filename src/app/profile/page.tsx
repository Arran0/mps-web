'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/supabase'
import { motion } from 'framer-motion'
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
  Lock
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Profile Header Card */}
          <motion.div variants={itemVariants} className="glass-strong rounded-3xl overflow-hidden mb-6">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-mps-blue-500 via-mps-blue-400 to-mps-green-400 relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTRtMC0xNmMwLTIuMjA5LTEuNzkxLTQtNC00cy00IDEuNzkxLTQgNCAxLjc5MSA0IDQgNCA0LTEuNzkxIDQtNG0xNiAxNmMwLTIuMjA5LTEuNzkxLTQtNC00cy00IDEuNzkxLTQgNCAxLjc5MSA0IDQgNCA0LTEuNzkxIDQtNG0tMzIgMGMwLTIuMjA5LTEuNzkxLTQtNC00cy00IDEuNzkxLTQgNCAxLjc5MSA0IDQgNCA0LTEuNzkxIDQtNG0xNiAxNmMwLTIuMjA5LTEuNzkxLTQtNC00cy00IDEuNzkxLTQgNCAxLjc5MSA0IDQgNCA0LTEuNzkxIDQtNCIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            </div>

            {/* Profile Info */}
            <div className="px-6 sm:px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 relative z-10">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white text-4xl font-bold shadow-2xl border-4 border-white">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <button className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow">
                    <Camera size={16} className="text-slate-600" />
                  </button>
                </div>

                {/* Name and Role */}
                <div className="flex-1 sm:pb-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 mb-1">
                    {profile?.full_name || 'User'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      profile ? getRoleBadgeColor(profile.role) : 'bg-slate-100 text-slate-600'
                    }`}>
                      {profile ? getRoleDisplayName(profile.role) : 'Loading...'}
                    </span>
                    <span className="text-slate-500 text-sm">Member since {profile?.created_at ? formatDate(profile.created_at) : '...'}</span>
                  </div>
                </div>

                {/* Edit Button */}
                <button className="btn-ghost flex items-center gap-2 self-start sm:self-end">
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              </div>
            </div>
          </motion.div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <User className="text-mps-blue-500" size={20} />
                  Personal Information
                </h2>

                <div className="space-y-5">
                  {/* Full Name */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                      <User size={18} className="text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-500 mb-1">Full Name</p>
                      <p className="font-medium text-slate-800">{profile?.full_name || 'Not set'}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                      <Mail size={18} className="text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-500 mb-1">Email Address</p>
                      <p className="font-medium text-slate-800">{user?.email || 'Not set'}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                      <Shield size={18} className="text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-500 mb-1">Role</p>
                      <p className="font-medium text-slate-800">{profile ? getRoleDisplayName(profile.role) : 'Not set'}</p>
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                      <Calendar size={18} className="text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-500 mb-1">Member Since</p>
                      <p className="font-medium text-slate-800">{profile?.created_at ? formatDate(profile.created_at) : 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Settings className="text-mps-blue-500" size={20} />
                  Quick Actions
                </h2>

                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
                    <div className="p-2 bg-mps-blue-50 rounded-lg">
                      <Bell size={18} className="text-mps-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Notifications</p>
                      <p className="text-xs text-slate-500">Manage alerts</p>
                    </div>
                  </button>

                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
                    <div className="p-2 bg-mps-green-50 rounded-lg">
                      <Lock size={18} className="text-mps-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Security</p>
                      <p className="text-xs text-slate-500">Password & 2FA</p>
                    </div>
                  </button>

                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Settings size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Preferences</p>
                      <p className="text-xs text-slate-500">App settings</p>
                    </div>
                  </button>

                  <hr className="my-4 border-slate-100" />

                  <button 
                    onClick={signOut}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 transition-colors text-left group"
                  >
                    <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                      <LogOut size={18} className="text-rose-600" />
                    </div>
                    <div>
                      <p className="font-medium text-rose-600 text-sm">Sign Out</p>
                      <p className="text-xs text-slate-500">End your session</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
