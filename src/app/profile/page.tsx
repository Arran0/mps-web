'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleDisplayName, getRoleBadgeColor, supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Mail,
  Shield,
  Calendar,
  LogOut,
  KeyRound,
  Loader2,
  Check,
  AlertCircle,
  Camera,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isAdmin = profile?.role === 'admin'

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

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
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    setUploadingAvatar(false)
    e.target.value = ''
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setPasswordLoading(true)
    setPasswordMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setPasswordMsg(
      error
        ? { type: 'error', text: error.message }
        : { type: 'success', text: `Reset link sent to ${user.email}` }
    )
    setPasswordLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user || !profile) return null

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl overflow-hidden shadow-2xl mb-5"
        >
          {/* Banner */}
          <div className="h-36 sm:h-44 relative">
            {bannerUrl ? (
              <Image src={bannerUrl} alt="" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-mps-blue-600 via-mps-blue-500 to-mps-green-500" />
            )}
            {/* Subtle pattern overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}
            />
          </div>

          {/* Avatar centred, overlapping banner */}
          <div className="flex flex-col items-center -mt-14 pb-6 px-6">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group rounded-full focus:outline-none"
              title="Change profile picture"
            >
              {/* Avatar circle */}
              <div className="w-28 h-28 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={112} height={112} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-white text-4xl font-bold">{initials}</span>
                )}
              </div>
              {/* Camera overlay on hover */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? (
                  <Loader2 size={22} className="text-white animate-spin" />
                ) : (
                  <Camera size={22} className="text-white" />
                )}
              </div>
            </button>

            {/* Name & role */}
            <h1 className="mt-3 font-display text-2xl font-bold text-slate-800 text-center">
              {profile.full_name || 'User'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getRoleBadgeColor(profile.role)}`}>
                {getRoleDisplayName(profile.role)}
              </span>
            </div>

            {/* Profile info rows */}
            <div className="w-full mt-5 space-y-2.5">
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <Mail size={16} className="text-mps-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="font-medium text-slate-700 text-sm truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <Shield size={16} className="text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Role</p>
                  <p className="font-medium text-slate-700 text-sm">{getRoleDisplayName(profile.role)}</p>
                </div>
              </div>
              {profile.created_at && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <Calendar size={16} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Member since</p>
                    <p className="font-medium text-slate-700 text-sm">{formatDate(profile.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Password Reset */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <KeyRound size={16} className="text-violet-500" />
                  Change Password
                </p>
                <p className="text-xs text-slate-500 mt-0.5">A reset link will be sent to your email</p>
              </div>
              <button
                onClick={handlePasswordReset}
                disabled={passwordLoading}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 flex-shrink-0"
              >
                {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {passwordLoading ? 'Sending…' : 'Send link'}
              </button>
            </div>
            <AnimatePresence>
              {passwordMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {passwordMsg.type === 'success' ? <Check size={13} /> : <AlertCircle size={13} />}
                  {passwordMsg.text}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Sign Out */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors text-rose-600 font-semibold"
          >
            <LogOut size={18} />
            Sign Out
          </motion.button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Profile details can only be updated by an administrator.
        </p>
      </div>
    </ProtectedLayout>
  )
}
