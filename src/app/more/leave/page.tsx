'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { Calendar } from 'lucide-react'

export default function LeavePage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="Leave Manager"
        description="Apply for leave, check leave balance, and track your applications. Coming soon!"
        icon={<Calendar className="w-14 h-14 text-cyan-500" strokeWidth={1.5} />}
        backLink="/more"
        backLabel="Back to More"
      />
    </ProtectedLayout>
  )
}
