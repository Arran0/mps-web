'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { CalendarDays } from 'lucide-react'

export default function StaffLeavePage() {
  return (
    <ProtectedLayout staffOnly>
      <UnderConstruction
        title="Staff Leave Manager"
        description="Apply for leave, track your leave balance, and manage your leave history. This feature is coming soon!"
        icon={<CalendarDays className="w-14 h-14 text-purple-500" strokeWidth={1.5} />}
        backLink="/more"
        backLabel="Back to More"
      />
    </ProtectedLayout>
  )
}
