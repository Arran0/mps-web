'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/home')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
          <Image
            src="/logo.png"
            alt="MPS Logo"
            width={80}
            height={80}
            className="object-cover w-full h-full"
            priority
          />
        </div>
        <div className="spinner mx-auto" />
        <p className="mt-4 text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}
