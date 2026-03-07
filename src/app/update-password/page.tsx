'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MPSLogo from '@/components/MPSLogo'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // 1. PKCE flow: Supabase v2 invite/reset links send ?code= in the query string
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelled) {
          if (!exchangeError && data.session) {
            setSessionReady(true)
          }
          setChecking(false)
        }
        return
      }

      // 2. Legacy hash-based flow: check if SDK already exchanged tokens from URL hash
      const { data: { session } } = await supabase.auth.getSession()
      if (!cancelled && session) {
        setSessionReady(true)
        setChecking(false)
        return
      }

      // 3. Listen for PASSWORD_RECOVERY / SIGNED_IN events (hash token flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          if (!cancelled) {
            setSessionReady(true)
            setChecking(false)
          }
        }
      })

      // 4. Timeout: if no session after 5 s, link is invalid/expired
      const timer = setTimeout(() => {
        if (!cancelled) setChecking(false)
      }, 5000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timer)
      }
    }

    const cleanup = bootstrap()

    return () => {
      cancelled = true
      cleanup.then(fn => fn?.())
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    // Sign out so the user logs in fresh with their new password
    await supabase.auth.signOut()
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <MPSLogo size={64} />
        </div>

        <div className="glass-strong rounded-3xl shadow-2xl p-8">
          {success ? (
            /* ── Success ── */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={34} className="text-green-500" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">Password Set!</h2>
              <p className="text-slate-500 text-sm">Your account is now active. Redirecting to sign-in…</p>
            </div>
          ) : checking ? (
            /* ── Checking session ── */
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin text-mps-blue-500 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Verifying your invite link…</p>
            </div>
          ) : !sessionReady ? (
            /* ── Invalid / expired link ── */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={34} className="text-red-500" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">Link Expired</h2>
              <p className="text-slate-500 text-sm mb-6">
                This invite link is invalid or has expired. Ask your administrator to send a new one.
              </p>
              <button onClick={() => router.push('/login')} className="btn-primary w-full">
                Back to Sign In
              </button>
            </div>
          ) : (
            /* ── Set password form ── */
            <>
              <div className="text-center mb-7">
                <div className="w-14 h-14 bg-mps-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock size={26} className="text-mps-blue-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-800">Set Your Password</h2>
                <p className="text-slate-500 text-sm mt-1">Create a password to activate your account</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pl-10 pr-10"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Repeat your password"
                      required
                    />
                  </div>
                </div>

                {/* Strength hint */}
                {password.length > 0 && (
                  <div className="flex gap-1">
                    {[8, 10, 12].map((len, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= len
                            ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-green-400'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] text-slate-400 ml-1">
                      {password.length < 8 ? 'Too short' : password.length < 10 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  {loading ? 'Saving…' : 'Activate Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
