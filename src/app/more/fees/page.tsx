'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { CreditCard } from 'lucide-react'

export default function FeesPage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="Fee Manager"
        description="View fee structure, payment history, and make online payments. This feature is coming soon!"
        icon={<CreditCard className="w-14 h-14 text-emerald-500" strokeWidth={1.5} />}
        backLink="/more"
        backLabel="Back to More"
      />
    </ProtectedLayout>
  )
}
