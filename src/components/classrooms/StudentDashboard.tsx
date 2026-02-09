'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, FileText, GraduationCap, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { fetchAllFilesForClassroom, fetchProgressForStudent, ClassroomFile, ClassroomFolder, FileStatus } from '@/lib/classrooms'

interface StudentDashboardProps {
  classroomId: string
  userId: string
}

interface DashboardFile extends ClassroomFile {
  folder: ClassroomFolder
  status: FileStatus
}

export default function StudentDashboard({ classroomId, userId }: StudentDashboardProps) {
  const [files, setFiles] = useState<DashboardFile[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const allFiles = await fetchAllFilesForClassroom(classroomId)
    const fileIds = allFiles.map((f) => f.id)
    const progress = await fetchProgressForStudent(userId, fileIds)

    const progressMap: Record<string, FileStatus> = {}
    for (const p of progress) progressMap[p.file_id] = p.status as FileStatus

    const enriched: DashboardFile[] = allFiles.map((f) => ({
      ...f,
      status: progressMap[f.id] || 'not_done',
    }))

    setFiles(enriched)
    setLoading(false)
  }, [classroomId, userId])

  useEffect(() => { loadData() }, [loadData])

  const today = new Date().toDateString()
  const todayStr = new Date().toISOString().split('T')[0]

  const todayFiles = files.filter((f) => f.due_date === todayStr)
  const upcomingFiles = files.filter((f) => f.due_date && f.due_date > todayStr && f.status !== 'done')
  const overdueFiles = files.filter((f) => {
    if (!f.due_date || f.status === 'done') return false
    return f.due_date < todayStr
  })
  const undatedFiles = files.filter((f) => !f.due_date && f.status !== 'done')
  const completedFiles = files.filter((f) => f.status === 'done')

  const totalFiles = files.length
  const doneCount = completedFiles.length
  const progressPct = totalFiles > 0 ? Math.round((doneCount / totalFiles) * 100) : 0

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    )
  }

  const FileItem = ({ file }: { file: DashboardFile }) => {
    const isHomework = file.folder.type === 'homework'
    const overdue = file.due_date && file.due_date < todayStr && file.status !== 'done'

    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
        <div className={`p-1.5 rounded-lg ${isHomework ? 'bg-purple-100' : 'bg-mps-blue-100'}`}>
          {isHomework ? <FileText size={14} className="text-purple-600" /> : <GraduationCap size={14} className="text-mps-blue-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${file.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            {file.title}
          </p>
          <p className="text-xs text-slate-400">{file.folder.title} &middot; {isHomework ? 'Homework' : 'Course Work'}</p>
        </div>
        {file.due_date && (
          <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
            {new Date(file.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
        {file.status === 'done' && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-slate-800">Your Progress</h3>
          <span className="text-2xl font-bold text-mps-blue-600">{progressPct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-mps-blue-500 to-mps-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">{doneCount} of {totalFiles} items completed</p>
      </div>

      {/* Overdue Section */}
      {overdueFiles.length > 0 && (
        <div className="glass rounded-2xl p-4 border border-red-200 bg-red-50/50">
          <h3 className="font-medium text-red-700 flex items-center gap-2 mb-3">
            <AlertTriangle size={16} /> Overdue ({overdueFiles.length})
          </h3>
          <div className="space-y-1">
            {overdueFiles.map((f) => <FileItem key={f.id} file={f} />)}
          </div>
        </div>
      )}

      {/* Today */}
      {todayFiles.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="font-medium text-slate-800 flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-mps-blue-600" /> Due Today ({todayFiles.length})
          </h3>
          <div className="space-y-1">
            {todayFiles.map((f) => <FileItem key={f.id} file={f} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingFiles.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="font-medium text-slate-800 flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" /> Upcoming ({upcomingFiles.length})
          </h3>
          <div className="space-y-1">
            {upcomingFiles.slice(0, 10).map((f) => <FileItem key={f.id} file={f} />)}
            {upcomingFiles.length > 10 && (
              <p className="text-xs text-slate-400 text-center py-2">+{upcomingFiles.length - 10} more items</p>
            )}
          </div>
        </div>
      )}

      {/* Undated */}
      {undatedFiles.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="font-medium text-slate-800 flex items-center gap-2 mb-3">
            <FileText size={16} className="text-slate-400" /> No Due Date ({undatedFiles.length})
          </h3>
          <div className="space-y-1">
            {undatedFiles.map((f) => <FileItem key={f.id} file={f} />)}
          </div>
        </div>
      )}

      {/* All done */}
      {files.length > 0 && overdueFiles.length === 0 && todayFiles.length === 0 && upcomingFiles.length === 0 && undatedFiles.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <CheckCircle2 size={36} className="text-green-500 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">All caught up!</p>
          <p className="text-sm text-slate-400">You&apos;ve completed all your work.</p>
        </div>
      )}

      {files.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Calendar size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No assignments yet in this classroom.</p>
        </div>
      )}
    </div>
  )
}
