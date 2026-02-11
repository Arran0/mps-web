'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  GraduationCap,
  BookOpen,
  AlertTriangle,
} from 'lucide-react'
import {
  ClassroomWithDetails,
  ClassroomFile,
  ClassroomFolder,
  fetchAllFilesForClassroom,
  fetchProgressForStudent,
  updateFileProgress,
  FileProgress,
  FileStatus,
} from '@/lib/classrooms'

interface SchoolWorkItem {
  file: ClassroomFile & { folder: ClassroomFolder }
  classroom: ClassroomWithDetails
  progress: FileStatus
}

interface SchoolWorkCalendarProps {
  userId: string
  classrooms: ClassroomWithDetails[]
}

const STATUS_COLORS: Record<FileStatus, string> = {
  not_done: 'bg-red-100 text-red-700 border-red-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  done: 'bg-green-100 text-green-700 border-green-200',
}

const STATUS_LABELS: Record<FileStatus, string> = {
  not_done: 'Not Done',
  partial: 'Partial',
  done: 'Done',
}

function getNextStatus(current: FileStatus): FileStatus {
  if (current === 'not_done') return 'partial'
  if (current === 'partial') return 'done'
  return 'not_done'
}

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate)
  start.setDate(start.getDate() - start.getDay() + 1) // Monday
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default function SchoolWorkCalendar({ userId, classrooms }: SchoolWorkCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [items, setItems] = useState<SchoolWorkItem[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const baseDate = new Date(today)
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const todayStr = formatDateKey(today)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const allItems: SchoolWorkItem[] = []

      for (const classroom of classrooms) {
        const files = await fetchAllFilesForClassroom(classroom.id)
        if (files.length === 0) continue

        const fileIds = files.map(f => f.id)
        const progressList = await fetchProgressForStudent(userId, fileIds)
        const progressMap = new Map(progressList.map(p => [p.file_id, p.status]))

        for (const file of files) {
          allItems.push({
            file,
            classroom,
            progress: progressMap.get(file.id) || 'not_done',
          })
        }
      }

      setItems(allItems)
    } catch (err) {
      console.error('Failed to load school work:', err)
    }
    setLoading(false)
  }, [userId, classrooms])

  useEffect(() => { loadData() }, [loadData])

  const handleStatusChange = async (fileId: string, currentStatus: FileStatus) => {
    const newStatus = getNextStatus(currentStatus)
    const success = await updateFileProgress(fileId, userId, newStatus)
    if (success) {
      setItems(prev => prev.map(item =>
        item.file.id === fileId ? { ...item, progress: newStatus } : item
      ))
    }
  }

  // Group items by due_date
  const itemsByDate = new Map<string, SchoolWorkItem[]>()
  items.forEach(item => {
    const key = item.file.due_date || 'undated'
    if (!itemsByDate.has(key)) itemsByDate.set(key, [])
    itemsByDate.get(key)!.push(item)
  })

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="spinner mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading school work...</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Week Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-800">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {weekDates.map((date, i) => {
          const dateKey = formatDateKey(date)
          const dayItems = itemsByDate.get(dateKey) || []
          const isToday = dateKey === todayStr
          const isPast = dateKey < todayStr

          return (
            <div key={dateKey} className={`min-h-[120px] ${isToday ? 'bg-cyan-50/50' : ''}`}>
              <div className={`p-2 text-center border-b border-slate-100 ${isToday ? 'bg-cyan-100/50' : 'bg-slate-50/50'}`}>
                <p className="text-xs text-slate-500">{dayNames[i]}</p>
                <p className={`text-sm font-semibold ${isToday ? 'text-cyan-700' : 'text-slate-700'}`}>
                  {date.getDate()}
                </p>
              </div>
              <div className="p-1.5 space-y-1">
                {dayItems.map((item) => {
                  const isOverdue = isPast && item.progress !== 'done'
                  return (
                    <div
                      key={item.file.id}
                      className={`p-1.5 rounded-lg text-xs ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-100'}`}
                    >
                      <div className="flex items-start gap-1 mb-1">
                        {item.file.folder.type === 'homework' ? (
                          <FileText size={10} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <GraduationCap size={10} className="text-purple-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="font-medium text-slate-700 line-clamp-2 leading-tight">{item.file.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 truncate">{item.classroom.title}</span>
                        {isOverdue && <AlertTriangle size={10} className="text-red-500 flex-shrink-0" />}
                      </div>
                      <button
                        onClick={() => handleStatusChange(item.file.id, item.progress)}
                        className={`mt-1 w-full text-center py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[item.progress]}`}
                      >
                        {STATUS_LABELS[item.progress]}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Undated Items */}
      {(itemsByDate.get('undated') || []).length > 0 && (
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">No Due Date</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(itemsByDate.get('undated') || []).map((item) => (
              <div key={item.file.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <p className="font-medium text-slate-700 truncate">{item.file.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{item.classroom.title}</p>
                <button
                  onClick={() => handleStatusChange(item.file.id, item.progress)}
                  className={`mt-1 w-full text-center py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[item.progress]}`}
                >
                  {STATUS_LABELS[item.progress]}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
