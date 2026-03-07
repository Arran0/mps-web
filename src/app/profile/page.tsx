'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleDisplayName, getRoleBadgeColor, supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Mail,
  User,
  Shield,
  Calendar,
  Camera,
  LogOut,
  Lock,
  CheckCircle,
  KeyRound,
  ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isAdmin = profile?.role === 'admin'

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Load avatar from profile and banner from app_settings
  const loadBanner = useCallback(async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'profile_banner_url')
      .single()
    if (data?.value) setBannerUrl(data.value)
  }, [])

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
    loadBanner()
  }, [profile, loadBanner])

  // Upload avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    setUploadingAvatar(false)
  }

  // Upload banner (admin only)
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !isAdmin) return
    setUploadingBanner(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `global/banner.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path)
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`

      await supabase.from('app_settings').upsert({ key: 'profile_banner_url', value: publicUrl, updated_at: new Date().toISOString() })
      setBannerUrl(publicUrl)
    } catch (err) {
      console.error('Banner upload failed:', err)
    }
    setUploadingBanner(false)
  }

  // Password reset email
  const handlePasswordReset = async () => {
    if (!user?.email) return
    setPasswordLoading(true)
    setPasswordMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: `Password reset email sent to ${user.email}` })
    }
    setPasswordLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl overflow-hidden mb-6 shadow-xl"
        >
          {/* Banner */}
          <div className="h-32 sm:h-40 relative group">
            {bannerUrl ? (
              <Image src={bannerUrl} alt="Banner" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-mps-blue-600 via-mps-blue-500 to-mps-green-500" />
            )}
            {/* Banner overlay pattern */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
            />
            {/* Admin: change banner button */}
            {isAdmin && (
              <>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerChange}
                />
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white text-xs rounded-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                >
                  {uploadingBanner ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                  Change Banner
                </button>
              </>
            )}
          </div>

          {/* Avatar + Info */}
          <div className="px-6 sm:px-8 pb-6">
            <div className="flex items-end gap-5 -mt-12">
              {/* Avatar */}
              <div className="relative flex-shrink-0 group/avatar">
                <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-2xl">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" width={88} height={88} className="rounded-xl object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">
                        {profile.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 p-2 bg-white rounded-xl shadow-lg hover:shadow-xl border border-slate-100 transition-all"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={14} className="text-mps-blue-500 animate-spin" />
                  ) : (
                    <Camera size={14} className="text-slate-600" />
                  )}
                </button>
              </div>

              {/* Name / role */}
              <div className="pb-2 flex-1 min-w-0">
                <h1 className="font-display text-2xl font-bold text-slate-800 truncate">
                  {profile.full_name || 'User'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${getRoleBadgeColor(profile.role)}`}>
                    {getRoleDisplayName(profile.role)}
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <div className="flex items-center gap-1 text-mps-green-600 text-xs font-medium">
                    <CheckCircle size={12} />
                    Verified
                  </div>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-slate-500 text-xs">
                    Since {profile.created_at ? formatDate(profile.created_at) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Info + Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-3"
          >
            <div className="glass rounded-2xl p-6 h-full">
              <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-mps-blue-500 to-mps-blue-600 rounded-xl text-white shadow">
                  <User size={16} />
                </div>
                Profile Details
              </h2>

              <div className="space-y-3">
                {/* Full Name */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <User size={16} className="text-mps-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Full Name</p>
                    <p className="font-semibold text-slate-800">{profile.full_name || '—'}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <Mail size={16} className="text-mps-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Email Address</p>
                    <p className="font-semibold text-slate-800 truncate">{user.email || '—'}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <Shield size={16} className="text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Role</p>
                    <p className="font-semibold text-slate-800">{getRoleDisplayName(profile.role)}</p>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <Calendar size={16} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Member Since</p>
                    <p className="font-semibold text-slate-800">
                      {profile.created_at ? formatDate(profile.created_at) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
                <Lock size={11} />
                Profile details can only be changed by an administrator.
              </p>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Change Photo */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg text-white shadow">
                  <Camera size={14} />
                </div>
                Profile Picture
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Upload a photo to personalise your profile. Only you can change your own picture.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-mps-blue-200 hover:border-mps-blue-400 hover:bg-mps-blue-50 text-mps-blue-600 text-sm font-medium transition-all"
              >
                {uploadingAvatar ? (
                  <><Loader2 size={15} className="animate-spin" /> Uploading...</>
                ) : (
                  <><Upload size={15} /> Choose Photo</>
                )}
              </button>
            </div>

            {/* Change Password */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg text-white shadow">
                  <KeyRound size={14} />
                </div>
                Password
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                We'll send a secure link to your email address to reset your password.
              </p>

              <AnimatePresence mode="wait">
                {passwordMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-start gap-2 p-3 rounded-lg text-xs mb-3 ${
                      passwordMsg.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {passwordMsg.type === 'success' ? <Check size={13} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
                    {passwordMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handlePasswordReset}
                disabled={passwordLoading}
                className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
              >
                {passwordLoading ? (
                  <><Loader2 size={15} className="animate-spin" /> Sending...</>
                ) : (
                  <><KeyRound size={15} /> Send Reset Email</>
                )}
              </button>
            </div>

            {/* Admin: Change Banner */}
            {isAdmin && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg text-white shadow">
                    <ImageIcon size={14} />
                  </div>
                  Profile Banner
                  <span className="text-xs text-amber-600 font-normal ml-auto">Admin only</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  This banner appears on every user's profile page across the school.
                </p>
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-600 text-sm font-medium transition-all"
                >
                  {uploadingBanner ? (
                    <><Loader2 size={15} className="animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload size={15} /> Change Banner</>
                  )}
                </button>
              </div>
            )}

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors text-rose-600 font-medium"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
