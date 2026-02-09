'use client'

import React from 'react'
import FolderFileView from './FolderFileView'
import { UserRole } from '@/lib/supabase'
import { ClassroomWithDetails } from '@/lib/classrooms'

interface CourseWorkTabProps {
  classroomId: string
  userId: string
  userRole: UserRole
  classroom: ClassroomWithDetails
}

export default function CourseWorkTab({ classroomId, userId, userRole, classroom }: CourseWorkTabProps) {
  return (
    <FolderFileView
      classroomId={classroomId}
      userId={userId}
      userRole={userRole}
      type="coursework"
      classroom={classroom}
    />
  )
}
