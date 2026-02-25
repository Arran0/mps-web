'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Circle, CircleDot, CheckCircle2,
  AlertTriangle, Clock, ChevronDown, X, BookOpen, Folder,
  FileText, ExternalLink, Link2, Upload,
} from 'lucide-react'
import {
  ClassroomWithDetails, ClassroomFile, ClassroomFolder,
  FileStatus, fetchAllFilesForClassroom, fetchProgressForStudent,
  updateFileProgress,
} from '@/lib/classrooms'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkItem extends ClassroomFile {
  folder: ClassroomFolder
  classroomId: string
  classroomTitle: string
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_ICON: Record<FileStatus, React.ReactNode> = {
  not_done:  <Circle       size={14} className="text-red-400" />,
  partial:   <CircleDot    size={14} className="text-amber-500" />,
  done:      <CheckCircle2 size={14} className="text-blue-500" />,
  completed: <CheckCircle2 size={14} className="text-green-500" />,
}

const STATUS_BORDER: Record<FileStatus, string> = {
  not_done:  'border-slate-200 bg-white',
  partial:   'border-amber-300 bg-amber-50',
  done:      'border-blue-300 bg-blue-50',
  completed: 'border-green-200 bg-green-50',
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Parse YYYY-MM-DD without timezone shift */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getNextStatus(
  current: FileStatus,
  requiresCheck: boolean,
): FileStatus {
  const cycle: FileStatus[] = requiresCheck
    ? ['not_done', 'partial', 'done']          // students can't mark completed
    : ['not_done', 'partial', 'completed']
  return cycle[(cycle.indexOf(current) + 1) % cycle.length]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-block px-1 rounded text-[9px] font-bold leading-tight ${
        type === 'homework'
          ? 'bg-purple-100 text-purple-600'
          : 'bg-cyan-100 text-cyan-600'
      }`}
    >
      {type === 'homework' ? 'HW' : 'CW'}
    </span>
  )
}

function WorkItemRow({
  item, status, onToggle, onExpand, showDate,
}: {
  item: WorkItem
  status: FileStatus
  onToggle: () => void
  onExpand: () => void
  showDate: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <button onClick={onToggle} className="flex-shrink-0" title="Tap to change status">
        {STATUS_ICON[status]}
      </button>
      <button onClick={onExpand} className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-medium truncate ${
          status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'
        }`}>
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <TypeBadge type={item.folder.type} />
          <span className="truncate">{item.classroomTitle}</span>
          {item.folder.title && (
            <span className="truncate">· {item.folder.title}</span>
          )}
        </div>
      </button>
      {showDate && item.due_date && (
        <span className="text-xs text-red-500 flex-shrink-0 font-medium whitespace-nowrap">
          {parseDate(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SchoolWorkManagerProps {
  classrooms: ClassroomWithDetails[]
  userId: string
}

const LIST_LIMIT = 5

export default function SchoolWorkManager({ classrooms, userId }: SchoolWorkManagerProps) {
  const [weekStart, setWeekStart]       = useState(() => getWeekStart(new Date()))
  const [workItems, setWorkItems]       = useState<WorkItem[]>([])
  const [progressMap, setProgressMap]   = useState<Record<string, FileStatus>>({})
  const [filesLoading, setFilesLoading] = useState(true)
  const [showMoreOverdue, setShowMoreOverdue]   = useState(false)
  const [showMoreUndated, setShowMoreUndated]   = useState(false)
  const [detailItem, setDetailItem]     = useState<WorkItem | null>(null)

  const loadFiles = useCallback(async () => {
    if (classrooms.length === 0) {
      setWorkItems([])
      setFilesLoading(false)
      return
    }
    setFilesLoading(true)

    const arrays = await Promise.all(
      classrooms.map(c =>
        fetchAllFilesForClassroom(c.id).then(files =>
          files.map(f => ({ ...f, classroomId: c.id, classroomTitle: c.title } as WorkItem))
        )
      )
    )
    const all = arrays.flat()
    setWorkItems(all)

    if (all.length > 0) {
      const progress = await fetchProgressForStudent(userId, all.map(f => f.id))
      const map: Record<string, FileStatus> = {}
      for (const p of progress) map[p.file_id] = p.status as FileStatus
      setProgressMap(map)
    }

    setFilesLoading(false)
  }, [classrooms, userId])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleToggle = async (item: WorkItem) => {
    const current = progressMap[item.id] || 'not_done'
    const next    = getNextStatus(current, item.requires_check)
    const ok      = await updateFileProgress(item.id, userId, next)
    if (ok) setProgressMap(prev => ({ ...prev, [item.id]: next }))
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const weekEnd = addDays(weekStart, 6)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getFilesForDay = (day: Date) =>
    workItems.filter(f => f.due_date && isSameDay(parseDate(f.due_date), day))

  const overdueItems = workItems.filter(f => {
    if (!f.due_date) return false
    return parseDate(f.due_date) < today && (progressMap[f.id] || 'not_done') !== 'completed'
  })

  const undatedItems = workItems.filter(f => {
    if (f.due_date) return false
    return (progressMap[f.id] || 'not_done') !== 'completed'
  })

  const weekLabel = (() => {
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${fmt(weekStart)} – ${fmt(weekEnd)}`
  })()

  // ── Render ──────────────────────────────────────────────────────────────────

  if (filesLoading) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-2" />
        <p className="text-sm text-slate-400">Loading school work…</p>
      </div>
    )
  }

  if (workItems.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        No tasks found across your classrooms.
      </p>
    )
  }

  const visibleOverdue = showMoreOverdue ? overdueItems : overdueItems.slice(0, LIST_LIMIT)
  const visibleUndated = showMoreUndated ? undatedItems : undatedItems.slice(0, LIST_LIMIT)

  return (
    <div className="space-y-4">

      {/* ── Week Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold text-slate-700">{weekLabel}</p>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Weekly Calendar ──────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
        <div className="flex min-w-[560px]">
          {weekDays.map((day, i) => {
            const isToday    = isSameDay(day, today)
            const dayFiles   = getFilesForDay(day)
            const isLastCol  = i === 6

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 min-w-0 flex flex-col ${!isLastCol ? 'border-r border-slate-100' : ''}`}
              >
                {/* Day header */}
                <div className={`px-1.5 py-2 text-center border-b border-slate-100 ${
                  isToday ? 'bg-cyan-100' : 'bg-slate-50'
                }`}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    {DAY_NAMES[i]}
                  </p>
                  <p className={`text-base font-bold leading-tight ${
                    isToday ? 'text-cyan-700' : 'text-slate-700'
                  }`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Files for this day */}
                <div className={`p-1 space-y-1 flex-1 min-h-[96px] ${isToday ? 'bg-cyan-50/40' : ''}`}>
                  {dayFiles.map(item => {
                    const status = progressMap[item.id] || 'not_done'
                    return (
                      <div
                        key={item.id}
                        className={`w-full text-[11px] p-1.5 rounded-lg border transition-all ${STATUS_BORDER[status]}`}
                      >
                        <div className="flex items-start gap-1">
                          {/* Status toggle — icon only */}
                          <button
                            onClick={() => handleToggle(item)}
                            className="flex-shrink-0 mt-0.5 hover:scale-125 transition-transform"
                            title="Tap to cycle status"
                          >
                            {STATUS_ICON[status]}
                          </button>
                          {/* Title — click to expand */}
                          <button
                            onClick={() => setDetailItem(item)}
                            className="min-w-0 flex-1 text-left"
                            title="Tap to see full title"
                          >
                            <p className={`font-medium leading-tight truncate ${
                              status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'
                            }`}>
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <TypeBadge type={item.folder.type} />
                              <span className="text-slate-400 truncate text-[10px]">
                                {item.classroomTitle}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Overdue Tasks ────────────────────────────────────────────────────── */}
      {overdueItems.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-red-500" />
            <h3 className="text-sm font-semibold text-slate-700">
              Overdue
              <span className="ml-1.5 text-xs font-normal text-red-400">({overdueItems.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleOverdue.map(item => (
              <WorkItemRow
                key={item.id}
                item={item}
                status={progressMap[item.id] || 'not_done'}
                onToggle={() => handleToggle(item)}
                onExpand={() => setDetailItem(item)}
                showDate
              />
            ))}
          </div>
          {overdueItems.length > LIST_LIMIT && (
            <button
              onClick={() => setShowMoreOverdue(v => !v)}
              className="mt-2 text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 font-medium"
            >
              {showMoreOverdue
                ? 'Show less'
                : `Show ${overdueItems.length - LIST_LIMIT} more`}
              <ChevronDown
                size={12}
                className={`transition-transform ${showMoreOverdue ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      )}

      {/* ── Undated Tasks ────────────────────────────────────────────────────── */}
      {undatedItems.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">
              No Due Date
              <span className="ml-1.5 text-xs font-normal text-slate-400">({undatedItems.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleUndated.map(item => (
              <WorkItemRow
                key={item.id}
                item={item}
                status={progressMap[item.id] || 'not_done'}
                onToggle={() => handleToggle(item)}
                onExpand={() => setDetailItem(item)}
                showDate={false}
              />
            ))}
          </div>
          {undatedItems.length > LIST_LIMIT && (
            <button
              onClick={() => setShowMoreUndated(v => !v)}
              className="mt-2 text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 font-medium"
            >
              {showMoreUndated
                ? 'Show less'
                : `Show ${undatedItems.length - LIST_LIMIT} more`}
              <ChevronDown
                size={12}
                className={`transition-transform ${showMoreUndated ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      )}

      {/* ── Work Item Detail Modal ───────────────────────────────────────────── */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Status toggle at top */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => { handleToggle(detailItem); setDetailItem(null) }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95 ${STATUS_BORDER[progressMap[detailItem.id] || 'not_done']}`}
                title="Tap to cycle status"
              >
                {STATUS_ICON[progressMap[detailItem.id] || 'not_done']}
                <span className="capitalize">{(progressMap[detailItem.id] || 'not_done').replace('_', ' ')}</span>
              </button>
              <button
                onClick={() => setDetailItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Full title */}
            <h2 className={`text-lg font-bold mb-3 leading-snug ${
              (progressMap[detailItem.id] || 'not_done') === 'completed'
                ? 'line-through text-slate-400'
                : 'text-slate-800'
            }`}>
              {detailItem.title}
            </h2>

            {/* Description */}
            {detailItem.description && (
              <p className="text-sm text-slate-600 leading-relaxed mb-3">{detailItem.description}</p>
            )}

            {/* Meta */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <BookOpen size={14} className="text-cyan-500 flex-shrink-0" />
                <span>{detailItem.classroomTitle}</span>
              </div>
              {detailItem.folder.title && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Folder size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{detailItem.folder.title}</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={detailItem.folder.type} />
                {detailItem.due_date && (
                  <span className="text-xs text-red-500 font-medium">
                    Due {parseDate(detailItem.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {detailItem.requires_submission && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium flex items-center gap-1">
                    <Upload size={10} /> Submission Required
                  </span>
                )}
              </div>
            </div>

            {/* Attachment */}
            {detailItem.attachment_url && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                {detailItem.attachment_name === 'Link' ? (
                  <a
                    href={detailItem.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Link2 size={14} />
                    <span className="flex-1 truncate">{detailItem.attachment_url}</span>
                    <ExternalLink size={12} />
                  </a>
                ) : detailItem.attachment_url.includes('youtube') || detailItem.attachment_url.includes('youtu.be') ? (
                  <a
                    href={detailItem.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span className="flex-1 truncate">YouTube Video</span>
                  </a>
                ) : (
                  <a
                    href={detailItem.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
                  >
                    <FileText size={14} />
                    <span className="flex-1 truncate">{detailItem.attachment_name || 'Attachment'}</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
