'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { Megaphone } from 'lucide-react'

export default function AnnouncementsPage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="Announcements"
        description="Stay updated with the latest school news and events. This feature is coming soon!"
        icon={<Megaphone className="w-14 h-14 text-mps-blue-500" strokeWidth={1.5} />}
        backLink="/home"
        backLabel="Back to Home"
      />
    </ProtectedLayout>
  )
}
