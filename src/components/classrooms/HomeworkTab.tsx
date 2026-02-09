'use client'

import React from 'react'
import FolderFileView from './FolderFileView'
import { UserRole } from '@/lib/supabase'
import { ClassroomWithDetails } from '@/lib/classrooms'

interface HomeworkTabProps {
  classroomId: string
  userId: string
  userRole: UserRole
  classroom: ClassroomWithDetails
}

export default function HomeworkTab({ classroomId, userId, userRole, classroom }: HomeworkTabProps) {
  return (
    <FolderFileView
      classroomId={classroomId}
      userId={userId}
      userRole={userRole}
      type="homework"
      classroom={classroom}
    />
  )
}
