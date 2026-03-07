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
  ImageIcon,
  Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const STORAGE_BUCKET = 'classroom-files'   // reuse existing public bucket

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [bannerSuccess, setBannerSuccess] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isAdmin = profile?.role === 'admin'

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Load banner from site_settings (same table the home page already uses)
  const loadBanner = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'profile_banner')
      .single()
    if (data?.value) setBannerUrl(data.value)
  }, [])

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
    loadBanner()
  }, [profile, loadBanner])

  // Upload avatar → classroom-files/avatars/<userId>.<ext>
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${user.id}.${ext}`
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      // append cache-bust timestamp
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setAvatarUrl(url)
      await refreshProfile()
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message ?? err))
    }
    setUploadingAvatar(false)
    e.target.value = ''
  }

  // Upload banner → classroom-files/site/profile_banner.<ext>  (admin only)
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !isAdmin) return
    setUploadingBanner(true)
    setBannerError(null)
    setBannerSuccess(false)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `site/profile_banner.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true })
      if (uploadError) throw new Error('Storage upload failed: ' + uploadError.message)
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      // Store in site_settings so every user's profile page loads it
      const { error: upsertError } = await supabase
        .from('site_settings')
        .upsert({ key: 'profile_banner', value: url }, { onConflict: 'key' })
      if (upsertError) throw new Error('Settings save failed: ' + upsertError.message)
      setBannerUrl(url)
      setBannerSuccess(true)
      setTimeout(() => setBannerSuccess(false), 3000)
    } catch (err: any) {
      setBannerError(err?.message ?? 'Banner upload failed')
    }
    setUploadingBanner(false)
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

  const initials =
    profile.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ||
    user.email?.charAt(0).toUpperCase() ||
    'U'

  return (
    <ProtectedLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">

        {/* ─── Profile Card ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden shadow-2xl mb-5 bg-white border border-slate-100"
        >
          {/* Banner */}
          <div className="relative h-36 sm:h-44 group">
            {bannerUrl ? (
              <Image src={bannerUrl} alt="" fill className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-mps-blue-600 via-mps-blue-500 to-mps-green-500" />
            )}
            {/* Dot pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='2' fill='%23fff'/%3E%3C/svg%3E")` }}
            />

            {/* Admin: change banner button (hover) */}
            {isAdmin && (
              <>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 cursor-pointer"
                >
                  <span className="flex items-center gap-2 bg-black/60 text-white text-sm font-medium px-4 py-2 rounded-xl backdrop-blur-sm">
                    {uploadingBanner ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                    {uploadingBanner ? 'Uploading…' : 'Change Banner'}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Avatar — centred, overlapping banner */}
          <div className="flex flex-col items-center -mt-14 pb-6 px-6">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group/av rounded-full focus:outline-none"
              title="Change profile picture"
            >
              <div className="w-28 h-28 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={112} height={112} className="object-cover w-full h-full" unoptimized />
                ) : (
                  <span className="text-white text-4xl font-bold select-none">{initials}</span>
                )}
              </div>
              {/* Camera overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/av:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                {uploadingAvatar
                  ? <Loader2 size={22} className="text-white animate-spin" />
                  : <Camera size={22} className="text-white" />
                }
              </div>
            </button>

            <p className="mt-1 text-xs text-slate-400">Tap to change photo</p>

            <h1 className="mt-2 font-display text-2xl font-bold text-slate-800 text-center leading-tight">
              {profile.full_name || 'User'}
            </h1>
            <div className="mt-1.5 flex flex-wrap justify-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getRoleBadgeColor(profile.role)}`}>
                {getRoleDisplayName(profile.role)}
              </span>
            </div>

            {/* Info rows */}
            <div className="w-full mt-5 space-y-2.5">
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <Mail size={16} className="text-mps-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Email</p>
                  <p className="font-medium text-slate-700 text-sm truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <Shield size={16} className="text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">Role</p>
                  <p className="font-medium text-slate-700 text-sm">{getRoleDisplayName(profile.role)}</p>
                </div>
              </div>
              {profile.created_at && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <Calendar size={16} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Member since</p>
                    <p className="font-medium text-slate-700 text-sm">{formatDate(profile.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── Actions ────────────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Change Password */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <KeyRound size={15} className="text-violet-500" /> Change Password
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
                  className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs overflow-hidden ${
                    passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {passwordMsg.type === 'success' ? <Check size={13} /> : <AlertCircle size={13} />}
                  {passwordMsg.text}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Admin: Change Banner (shown only to admins, affects all users) */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
              className="bg-amber-50 rounded-2xl border border-amber-100 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <ImageIcon size={15} className="text-amber-500" /> Profile Page Banner
                    <span className="text-[10px] font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Admin only</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Changes the banner shown on every user's profile page</p>
                </div>
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {uploadingBanner ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingBanner ? 'Uploading…' : 'Upload'}
                </button>
              </div>
              {bannerError && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700">
                  <AlertCircle size={13} /> {bannerError}
                </div>
              )}
              {bannerSuccess && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-green-50 text-green-700">
                  <Check size={13} /> Banner updated successfully
                </div>
              )}
            </motion.div>
          )}

          {/* Sign Out */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors text-rose-600 font-semibold"
          >
            <LogOut size={18} />
            Sign Out
          </motion.button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Account details (name, email, role) can only be updated by an administrator.
        </p>
      </div>
    </ProtectedLayout>
  )
}
