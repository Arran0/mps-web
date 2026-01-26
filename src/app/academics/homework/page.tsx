'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { FileText } from 'lucide-react'

export default function HomeworkPage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="Homework Management"
        description="Soon you'll be able to view, submit, and track all your homework assignments here. Stay tuned!"
        icon={<FileText className="w-14 h-14 text-blue-500" strokeWidth={1.5} />}
        backLink="/academics"
        backLabel="Back to Academics"
      />
    </ProtectedLayout>
  )
}
