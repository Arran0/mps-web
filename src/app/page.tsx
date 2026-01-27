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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mps-blue-100 via-slate-50 to-mps-green-100">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden shadow-xl ring-4 ring-white/80">
          <Image
            src="/logo.png"
            alt="MPS Logo"
            width={96}
            height={96}
            className="object-cover w-full h-full"
            priority
          />
        </div>
        <div className="spinner mx-auto" />
        <p className="mt-4 text-slate-600 text-sm font-medium">Loading MPS Web...</p>
      </div>
    </div>
  )
}
