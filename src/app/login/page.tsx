'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  GraduationCap,
  Users,
  Shield,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

type AuthMode = 'login' | 'signup'

const roleOptions: { value: UserRole; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'student', label: 'Student', icon: <GraduationCap size={20} />, description: 'Access homework, grades, and coursework' },
  { value: 'teacher', label: 'Teacher', icon: <BookOpen size={20} />, description: 'Manage classes and student progress' },
  { value: 'coordinator', label: 'Coordinator', icon: <Users size={20} />, description: 'Coordinate academic activities' },
  { value: 'principal', label: 'Principal', icon: <Shield size={20} />, description: 'School administration access' },
  { value: 'admin', label: 'Administrator', icon: <Shield size={20} />, description: 'Full system access' },
]

export default function LoginPage() {
  const { user, signIn, signUp, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/home')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        const { error } = await signUp(email, password, fullName, role)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Account created successfully! You can now sign in.')
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* ============================================== */}
      {/* LEFT PANEL - BRANDING                         */}
      {/* ============================================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-mps-blue-500 via-mps-blue-600 to-mps-green-500" />

        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-96 h-96 rounded-full bg-white/10 -top-48 -left-48"
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute w-64 h-64 rounded-full bg-white/10 bottom-20 left-20"
            animate={{ y: [-20, 20, -20] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-32 h-32 rounded-full bg-mps-green-400/30 top-1/4 left-1/4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Content - Centered */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 xl:px-16 text-white text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            {/* Big Circle Logo */}
            <motion.div
              className="w-32 h-32 xl:w-40 xl:h-40 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl overflow-hidden ring-4 ring-white/30 mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Image
                src="/logo.png"
                alt="MPS Logo"
                width={160}
                height={160}
                className="object-cover w-full h-full rounded-full"
              />
            </motion.div>

            {/* School Name */}
            <motion.h1
              className="text-3xl xl:text-4xl font-display font-semibold tracking-tight mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Muthamil Public School
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="text-white/90 text-lg xl:text-xl font-light tracking-wider mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Excel . Enrich . Enlighten
            </motion.p>

            {/* Welcome Text */}
            <motion.h2
              className="text-xl xl:text-2xl font-medium text-mps-green-200 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Welcome to MPS Web
            </motion.h2>

            {/* Feature list */}
            <div className="space-y-3">
              {[
                'Academic Progress Tracking',
                'Homework & Coursework Management',
                'Real-time Updates & Notifications'
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 justify-center"
                >
                  <div className="w-5 h-5 rounded-full bg-mps-green-400/30 flex items-center justify-center">
                    <CheckCircle size={12} className="text-mps-green-200" />
                  </div>
                  <span className="text-white/90 text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Curvy divider */}
        <div className="absolute top-0 right-0 h-full w-16 z-20">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 800"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 0H60C60 0 0 100 0 200C0 300 60 350 60 400C60 450 0 500 0 600C0 700 60 800 60 800H100V0Z"
              fill="#f8fafc"
            />
          </svg>
        </div>
      </div>

      {/* ============================================== */}
      {/* RIGHT PANEL - LOGIN FORM                      */}
      {/* ============================================== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-slate-200">
              <Image
                src="/logo.png"
                alt="MPS Logo"
                width={48}
                height={48}
                className="object-cover w-full h-full rounded-full"
              />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold gradient-text tracking-tight">MPS Web</h1>
              <p className="text-xs text-slate-500 font-light">Muthamil Public School</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-slate-200/50">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-500">
                {mode === 'login' 
                  ? 'Sign in to access your dashboard'
                  : 'Register to get started with MPS Web'
                }
              </p>
            </div>

            {/* Error/Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-4 mb-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700"
                >
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-4 mb-6 bg-mps-green-50 border border-mps-green-200 rounded-xl text-mps-green-700"
                >
                  <CheckCircle size={18} />
                  <span className="text-sm">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name (signup only) */}
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <User className="text-slate-400" size={20} />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 transition-all duration-300 placeholder:text-slate-400"
                        required={mode === 'signup'}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email - FIXED: Added more left padding to input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="text-slate-400" size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 transition-all duration-300 placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Password - FIXED: Added more left padding to input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="text-slate-400" size={20} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 transition-all duration-300 placeholder:text-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (signup only) - FIXED */}
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Lock className="text-slate-400" size={20} />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full pl-12 pr-12 py-3 bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 transition-all duration-300 placeholder:text-slate-400"
                        required={mode === 'signup'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Role Selection (signup only) */}
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Select Your Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {roleOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRole(option.value)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                            role === option.value
                              ? 'border-mps-blue-500 bg-mps-blue-50 text-mps-blue-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          {option.icon}
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {roleOptions.find(r => r.value === role)?.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
              <p className="text-slate-500">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login')
                    setError(null)
                    setSuccess(null)
                  }}
                  className="ml-2 text-mps-blue-600 font-medium hover:text-mps-blue-700 transition-colors"
                >
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-400 text-sm mt-6">
            © 2025 Muthamil Public School. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
