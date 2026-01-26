'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { ClipboardList } from 'lucide-react'

export default function TasksPage() {
  return (
    <ProtectedLayout staffOnly>
      <UnderConstruction
        title="Task Manager"
        description="The Task Manager will help you organize, assign, and track tasks efficiently. Coming soon!"
        icon={<ClipboardList className="w-14 h-14 text-amber-500" strokeWidth={1.5} />}
        backLink="/home"
        backLabel="Back to Home"
      />
    </ProtectedLayout>
  )
}
