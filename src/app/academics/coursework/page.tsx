'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { GraduationCap } from 'lucide-react'

export default function CourseworkPage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="Coursework Management"
        description="Access your course materials, syllabi, and learning resources. This feature is coming soon!"
        icon={<GraduationCap className="w-14 h-14 text-purple-500" strokeWidth={1.5} />}
        backLink="/academics"
        backLabel="Back to Academics"
      />
    </ProtectedLayout>
  )
}
