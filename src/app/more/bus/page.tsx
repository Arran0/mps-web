'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { Bus } from 'lucide-react'

export default function BusPage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="School Bus Manager"
        description="Track bus routes, view timings, and manage transportation details. Coming soon!"
        icon={<Bus className="w-14 h-14 text-rose-500" strokeWidth={1.5} />}
        backLink="/more"
        backLabel="Back to More"
      />
    </ProtectedLayout>
  )
}
