'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { Award } from 'lucide-react'

export default function GradesPage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="Grades"
        description="View your academic performance, grade reports, and progress tracking. Coming soon!"
        icon={<Award className="w-14 h-14 text-amber-500" strokeWidth={1.5} />}
        backLink="/academics"
        backLabel="Back to Academics"
      />
    </ProtectedLayout>
  )
}
