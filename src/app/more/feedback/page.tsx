'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import UnderConstruction from '@/components/UnderConstruction'
import { MessageSquare } from 'lucide-react'

export default function FeedbackPage() {
  return (
    <ProtectedLayout>
      <UnderConstruction
        title="Feedback"
        description="The feedback system is coming soon. You'll be able to share your thoughts and suggestions here."
        icon={<MessageSquare className="w-14 h-14 text-mps-blue-500" strokeWidth={1.5} />}
        backLink="/more"
        backLabel="Back to More"
      />
    </ProtectedLayout>
  )
}
