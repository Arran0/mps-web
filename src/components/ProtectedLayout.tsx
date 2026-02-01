'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'

interface ProtectedLayoutProps {
  children: React.ReactNode
  staffOnly?: boolean
}

export default function ProtectedLayout({ children, staffOnly = false }: ProtectedLayoutProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!loading && user && staffOnly && profile) {
      const isStaff = ['teacher', 'coordinator', 'principal', 'admin'].includes(profile.role)
      if (!isStaff) {
        router.push('/home')
      }
    }
  }, [user, profile, loading, staffOnly, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mps-blue-100 via-slate-50 to-mps-green-100">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden shadow-xl ring-4 ring-white/80">
            <Image
              src="/logo.png"
              alt="MPS Logo"
              width={80}
              height={80}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <div className="spinner mx-auto mb-2" />
          <p className="text-slate-600 text-sm font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (staffOnly && profile && !['teacher', 'coordinator', 'principal', 'admin'].includes(profile.role)) {
    return null
  }

  return (
    <>
      <Navbar />
      <main className="animate-fade-in">
        {children}
      </main>
    </>
  )
}
