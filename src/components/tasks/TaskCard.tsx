'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Clock,
  Tag,
  MessageSquare,
  CheckSquare,
  Square,
  ChevronRight,
  Send,
  Trash2,
  AlertTriangle,
  Star,
  Repeat,
  Edit3,
  Check,
  Plus,
  ShieldCheck,
  Users,
  Paperclip,
  Link2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import {
  TaskWithDetails,
  TaskStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  RECURRENCE_LABELS,
  getDynamicStatusLabel,
  getDynamicStatusColors,
  getDynamicDotColor,
  getNextStatus,
  updateTaskStatus,
  updateTask,
  updateTaskAssignees,
  updateChecklistItems,
  toggleChecklistItem,
  addComment,
  addChecklistItem,
  deleteTask,
  uploadTaskAttachment,
  TaskRecurrence,
  TaskTag,
} from '@/lib/tasks'
import { useAuth } from '@/contexts/AuthContext'
import { UserProfile } from '@/lib/supabase'

interface TaskCardProps {
  task: TaskWithDetails
  canCheck: boolean
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onTaskDeleted?: (taskId: string) => void
  onTaskUpdated?: () => void
  compact?: boolean
  availableAssignees?: UserProfile[]
}

/**
 * Determine edit/delete permissions based on roles:
 * - Teacher: can edit/delete only tasks THEY created
 * - Coordinator: can edit/delete any task EXCEPT those assigned to them by principal/admin
 * - Principal: can edit/delete any task EXCEPT those assigned to them by admin
 * - Admin: can edit/delete anything
 */
function canEditTask(task: TaskWithDetails, userId: string, userRole: string): boolean {
  if (userRole === 'admin') return true

  const isAssignee = task.assignees.some(a => a.user_id === userId)
  const creatorRole = task.creator?.role

  if (userRole === 'principal') {
    if (isAssignee && creatorRole === 'admin') return false
    return true
  }

  if (userRole === 'coordinator') {
    if (isAssignee && (creatorRole === 'principal' || creatorRole === 'admin')) return false
    return true
  }

  if (userRole === 'teacher') {
    return task.created_by === userId
  }

  return false
}

export default function TaskCard({
  task,
  canCheck,
  onStatusChange,
  onTaskDeleted,
  onTaskUpdated,
  compact,
  availableAssignees = [],
}: TaskCardProps) {
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newCheckItem, setNewCheckItem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string; type: 'image' | 'document' | 'link' } | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const commentFileRef = useRef<HTMLInputElement>(null)

  const requireCheck = task.require_check ?? false

  const handleStatusTap = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = getNextStatus(task.status, canCheck, requireCheck)
    if (next === task.status) return
    const ok = await updateTaskStatus(task.id, next)
    if (ok) onStatusChange(task.id, next)
  }

  const handleToggleChecklist = async (itemId: string, current: boolean) => {
    await toggleChecklistItem(itemId, !current)
    onTaskUpdated?.()
  }

  const handleCommentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAttachment(true)
    const result = await uploadTaskAttachment(file, task.id, user.id)
    if (result) setPendingAttachment(result)
    setUploadingAttachment(false)
    e.target.value = ''
  }

  const handleAddLink = () => {
    const trimmed = linkInput.trim()
    if (!trimmed) return
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    setPendingAttachment({ url, name: trimmed, type: 'link' })
    setLinkInput('')
    setShowLinkInput(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() && !pendingAttachment) return
    if (!user) return
    setSubmitting(true)
    await addComment(task.id, user.id, newComment.trim(), pendingAttachment ?? undefined)
    setNewComment('')
    setPendingAttachment(null)
    setSubmitting(false)
    onTaskUpdated?.()
  }

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return
    await addChecklistItem(task.id, newCheckItem.trim(), task.checklist.length)
    setNewCheckItem('')
    onTaskUpdated?.()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    const ok = await deleteTask(task.id)
    if (ok) onTaskDeleted?.(task.id)
  }

  const completedChecklist = task.checklist.filter(c => c.is_completed).length
  const totalChecklist = task.checklist.length

  const userCanEdit = user && profile ? canEditTask(task, user.id, profile.role) : false
  const statusLabel = getDynamicStatusLabel(task.status, requireCheck)
  const statusColorClass = getDynamicStatusColors(task.status, requireCheck)
  const dotColorClass = getDynamicDotColor(task.status, requireCheck)
  const nextStatusLabel = getDynamicStatusLabel(getNextStatus(task.status, canCheck, requireCheck), requireCheck)

  if (compact) {
    return (
      <>
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleStatusTap}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all active:scale-95 hover:shadow-md ${statusColorClass}`}
              title={`Tap to change status (${statusLabel} → ${nextStatusLabel})`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${dotColorClass}`} />
              {statusLabel}
            </button>

            <div className="flex-1 min-w-0" onClick={() => setIsOpen(true)}>
              <p className={`font-medium text-sm truncate ${task.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {task.due_date && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={10} /> {task.due_date}
                  </span>
                )}
                {task.timing && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={10} /> {task.timing}{task.end_time ? `–${task.end_time}` : ''}
                  </span>
                )}
                {(task.bonus_points > 0) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                    {task.bonus_points} BP
                  </span>
                )}
                {task.recurrence && task.recurrence !== 'none' && (
                  <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium flex items-center gap-0.5">
                    <Repeat size={8} /> {RECURRENCE_LABELS[task.recurrence]}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {task.is_overdue && <AlertTriangle size={14} className="text-red-500" />}
              {requireCheck && (
                <span title="Verification required">
                  <ShieldCheck size={12} className="text-mps-blue-400" />
                </span>
              )}
              {totalChecklist > 0 && (
                <span className="text-xs text-slate-500">{completedChecklist}/{totalChecklist}</span>
              )}
              {task.comments.length > 0 && (
                <span className="relative inline-block leading-none flex-shrink-0">
                  <MessageSquare size={14} className="text-slate-400 block" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {task.comments.length > 9 ? '9+' : task.comments.length}
                  </span>
                </span>
              )}
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </div>
        </motion.div>

        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {isOpen && (
              <TaskModal
                task={task}
                canCheck={canCheck}
                canEdit={userCanEdit}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onStatusTap={handleStatusTap}
                onToggleChecklist={handleToggleChecklist}
                onAddComment={handleAddComment}
                onAddCheckItem={handleAddCheckItem}
                onDelete={handleDelete}
                onTaskUpdated={onTaskUpdated}
                newComment={newComment}
                setNewComment={setNewComment}
                newCheckItem={newCheckItem}
                setNewCheckItem={setNewCheckItem}
                submitting={submitting}
                profile={profile}
                availableAssignees={availableAssignees}
                pendingAttachment={pendingAttachment}
                setPendingAttachment={setPendingAttachment}
                uploadingAttachment={uploadingAttachment}
                commentFileRef={commentFileRef}
                onCommentFileChange={handleCommentFileChange}
                linkInput={linkInput}
                setLinkInput={setLinkInput}
                showLinkInput={showLinkInput}
                setShowLinkInput={setShowLinkInput}
                onAddLink={handleAddLink}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
      </>
    )
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={handleStatusTap}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-semibold text-xs transition-all active:scale-95 hover:shadow-md ${statusColorClass}`}
            title={`Tap to change status (${statusLabel} → ${nextStatusLabel})`}
          >
            <div className={`w-3 h-3 rounded-full ${dotColorClass}`} />
            {statusLabel}
          </button>

          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${task.status === 'checked' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {task.title}
            </h3>

            {task.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {task.due_date && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={12} /> {task.due_date}
                </span>
              )}
              {task.timing && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12} /> {task.timing}{task.end_time ? `–${task.end_time}` : ''}
                </span>
              )}
              {task.is_overdue && (
                <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertTriangle size={12} /> Overdue
                </span>
              )}
              {(task.bonus_points > 0) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                  {task.bonus_points} BP
                </span>
              )}
              {task.recurrence && task.recurrence !== 'none' && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex items-center gap-1">
                  <Repeat size={10} /> {RECURRENCE_LABELS[task.recurrence]}
                </span>
              )}
              {requireCheck && (
                <span className="text-xs px-2 py-0.5 bg-mps-blue-50 text-mps-blue-600 rounded-full font-medium flex items-center gap-1">
                  <ShieldCheck size={10} /> Verification
                </span>
              )}
              {totalChecklist > 0 && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <CheckSquare size={12} /> {completedChecklist}/{totalChecklist}
                </span>
              )}
              {task.comments.length > 0 && (
                <span className="relative inline-block leading-none flex-shrink-0">
                  <MessageSquare size={14} className="text-slate-400 block" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {task.comments.length > 9 ? '9+' : task.comments.length}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <TaskModal
              task={task}
              canCheck={canCheck}
              canEdit={userCanEdit}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onStatusTap={handleStatusTap}
              onToggleChecklist={handleToggleChecklist}
              onAddComment={handleAddComment}
              onAddCheckItem={handleAddCheckItem}
              onDelete={handleDelete}
              onTaskUpdated={onTaskUpdated}
              newComment={newComment}
              setNewComment={setNewComment}
              newCheckItem={newCheckItem}
              setNewCheckItem={setNewCheckItem}
              submitting={submitting}
              profile={profile}
              availableAssignees={availableAssignees}
              pendingAttachment={pendingAttachment}
              setPendingAttachment={setPendingAttachment}
              uploadingAttachment={uploadingAttachment}
              commentFileRef={commentFileRef}
              onCommentFileChange={handleCommentFileChange}
              linkInput={linkInput}
              setLinkInput={setLinkInput}
              showLinkInput={showLinkInput}
              setShowLinkInput={setShowLinkInput}
              onAddLink={handleAddLink}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ============================================
// Task Detail Modal with Edit Support
// ============================================

interface TaskModalProps {
  task: TaskWithDetails
  canCheck: boolean
  canEdit: boolean
  isOpen: boolean
  onClose: () => void
  onStatusTap: (e: React.MouseEvent) => void
  onToggleChecklist: (itemId: string, current: boolean) => void
  onAddComment: () => void
  onAddCheckItem: () => void
  onDelete: () => void
  onTaskUpdated?: () => void
  newComment: string
  setNewComment: (v: string) => void
  newCheckItem: string
  setNewCheckItem: (v: string) => void
  submitting: boolean
  profile: any
  availableAssignees?: UserProfile[]
  pendingAttachment: { url: string; name: string; type: 'image' | 'document' | 'link' } | null
  setPendingAttachment: (a: { url: string; name: string; type: 'image' | 'document' | 'link' } | null) => void
  uploadingAttachment: boolean
  commentFileRef: React.RefObject<HTMLInputElement>
  onCommentFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  linkInput: string
  setLinkInput: (v: string) => void
  showLinkInput: boolean
  setShowLinkInput: (v: boolean) => void
  onAddLink: () => void
}

function TaskModal({
  task, canCheck, canEdit, isOpen, onClose, onStatusTap,
  onToggleChecklist, onAddComment, onAddCheckItem, onDelete,
  onTaskUpdated,
  newComment, setNewComment, newCheckItem, setNewCheckItem,
  submitting, profile, availableAssignees = [],
  pendingAttachment, setPendingAttachment, uploadingAttachment,
  commentFileRef, onCommentFileChange,
  linkInput, setLinkInput, showLinkInput, setShowLinkInput, onAddLink,
}: TaskModalProps) {
  const requireCheck = task.require_check ?? false

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')
  const [editDueDate, setEditDueDate] = useState(task.due_date || '')
  const [editStartTime, setEditStartTime] = useState(task.timing || '')
  const [editEndTime, setEditEndTime] = useState(task.end_time || '')
  const [editRequireCheck, setEditRequireCheck] = useState(requireCheck)
  const [editTag, setEditTag] = useState<TaskTag>(task.tag)
  const [editBonusPoints, setEditBonusPoints] = useState(task.bonus_points || 0)
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>(task.recurrence || 'none')
  const [editChecklistItems, setEditChecklistItems] = useState<string[]>(task.checklist.map(c => c.text))
  const [newEditCheckItem, setNewEditCheckItem] = useState('')
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>(task.assignees.map(a => a.user_id))
  const [saving, setSaving] = useState(false)

  // Coordinators can only reassign within their team
  const canEditAssignees = profile && ['coordinator', 'principal', 'admin'].includes(profile.role)

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)

    const ok = await updateTask(task.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      due_date: editDueDate || null,
      timing: editStartTime || null,
      end_time: editEndTime || null,
      require_check: editRequireCheck,
      tag: editTag,
      bonus_points: editBonusPoints,
      recurrence: editRecurrence,
    })

    // Update checklist items if changed
    const originalTexts = task.checklist.map(c => c.text)
    const checklistChanged = JSON.stringify(originalTexts) !== JSON.stringify(editChecklistItems)
    if (checklistChanged) {
      await updateChecklistItems(task.id, editChecklistItems)
    }

    // Update assignees if changed and user has permission
    if (canEditAssignees) {
      const originalIds = task.assignees.map(a => a.user_id).sort()
      const newIds = [...editAssigneeIds].sort()
      if (JSON.stringify(originalIds) !== JSON.stringify(newIds)) {
        await updateTaskAssignees(task.id, editAssigneeIds)
      }
    }

    setSaving(false)
    if (ok) {
      setEditing(false)
      onTaskUpdated?.()
    }
  }

  const handleStartEdit = () => {
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditDueDate(task.due_date || '')
    setEditStartTime(task.timing || '')
    setEditEndTime(task.end_time || '')
    setEditRequireCheck(task.require_check ?? false)
    setEditTag(task.tag)
    setEditBonusPoints(task.bonus_points || 0)
    setEditRecurrence(task.recurrence || 'none')
    setEditChecklistItems(task.checklist.map(c => c.text))
    setEditAssigneeIds(task.assignees.map(a => a.user_id))
    setEditing(true)
  }

  const toggleEditAssignee = (uid: string) => {
    setEditAssigneeIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const statusLabel = getDynamicStatusLabel(task.status, requireCheck)
  const statusColorClass = getDynamicStatusColors(task.status, requireCheck)
  const dotColorClass = getDynamicDotColor(task.status, requireCheck)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { e.stopPropagation(); onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onStatusTap}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 hover:shadow-lg ${statusColorClass}`}
              title="Tap to change status"
            >
              <div className={`w-3.5 h-3.5 rounded-full ${dotColorClass} animate-pulse`} />
              {statusLabel}
              <ChevronRight size={14} className="opacity-50" />
            </button>
            {(task.bonus_points > 0) && !editing && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                {task.bonus_points} BP
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={handleStartEdit}
                className="p-2 text-mps-blue-500 hover:text-mps-blue-700 hover:bg-mps-blue-50 rounded-lg transition-colors"
                title="Edit task"
              >
                <Edit3 size={16} />
              </button>
            )}
            {canEdit && (
              <button onClick={onDelete} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete task">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {editing ? (
            <div className="space-y-3 border border-mps-blue-200 rounded-2xl p-4 bg-mps-blue-50/30">
              <h4 className="text-sm font-semibold text-mps-blue-700 flex items-center gap-1.5">
                <Edit3 size={14} /> Edit Task
              </h4>

              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Title *"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
              />

              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 resize-none bg-white"
              />

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                />
              </div>

              {/* Start / End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Start Time</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={e => setEditStartTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">End Time</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={e => setEditEndTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
              </div>

              {/* Recurrence & Bonus Points */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Recurrence</label>
                  <select
                    value={editRecurrence}
                    onChange={e => setEditRecurrence(e.target.value as TaskRecurrence)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  >
                    {(Object.keys(RECURRENCE_LABELS) as TaskRecurrence[]).map(r => (
                      <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Bonus Points</label>
                  <select
                    value={editBonusPoints}
                    onChange={e => setEditBonusPoints(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  >
                    <option value="0">None</option>
                    <option value="1">1 Point</option>
                    <option value="2">2 Points</option>
                    <option value="3">3 Points</option>
                    <option value="4">4 Points</option>
                    <option value="5">5 Points</option>
                  </select>
                </div>
              </div>

              {/* Tag */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tag</label>
                <select
                  value={editTag || ''}
                  onChange={e => setEditTag(e.target.value === 'bonus' ? 'bonus' : null)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                >
                  <option value="">No tag</option>
                  <option value="bonus">Bonus</option>
                </select>
              </div>

              {/* Require Check toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className={editRequireCheck ? 'text-mps-blue-600' : 'text-slate-400'} />
                  <div>
                    <p className="text-xs font-medium text-slate-700">Require Verification</p>
                    <p className="text-[10px] text-slate-400">
                      {editRequireCheck ? 'Not Done → Partial → Awaiting Check → Completed' : 'Not Done → Partial → Completed'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditRequireCheck(prev => !prev)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    editRequireCheck ? 'bg-mps-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    editRequireCheck ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Assignees editor (coordinator/principal/admin only) */}
              {canEditAssignees && availableAssignees.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1 block">
                    <Users size={12} /> Assignees
                  </label>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-1.5 space-y-0.5 bg-white">
                    {availableAssignees.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleEditAssignee(u.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          editAssigneeIds.includes(u.id)
                            ? 'bg-mps-blue-50 text-mps-blue-700 border border-mps-blue-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          editAssigneeIds.includes(u.id) ? 'bg-mps-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        <span>{u.full_name}</span>
                        <span className="text-slate-400 ml-auto">{u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist editor */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Checklist Items</label>
                <div className="space-y-1 mb-2">
                  {editChecklistItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs text-slate-700 flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => setEditChecklistItems(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newEditCheckItem}
                    onChange={e => setNewEditCheckItem(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newEditCheckItem.trim()) {
                          setEditChecklistItems(prev => [...prev, newEditCheckItem.trim()])
                          setNewEditCheckItem('')
                        }
                      }
                    }}
                    placeholder="Add checklist item..."
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-mps-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEditCheckItem.trim()) {
                        setEditChecklistItems(prev => [...prev, newEditCheckItem.trim()])
                        setNewEditCheckItem('')
                      }
                    }}
                    className="p-1.5 text-mps-blue-600 hover:bg-mps-blue-50 rounded-lg"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{task.title}</h2>
                {task.description && (
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">{task.description}</p>
                )}
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-3">
                {task.due_date && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <Calendar size={14} />
                    <span>{task.due_date}</span>
                  </div>
                )}
                {task.timing && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <Clock size={14} />
                    <span>{task.timing}{task.end_time ? ` – ${task.end_time}` : ''}</span>
                  </div>
                )}
                {task.is_overdue && (
                  <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-medium">
                    <AlertTriangle size={14} />
                    <span>Overdue</span>
                  </div>
                )}
                {task.recurrence && task.recurrence !== 'none' && (
                  <div className="flex items-center gap-1.5 text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg font-medium">
                    <Repeat size={14} />
                    <span>{RECURRENCE_LABELS[task.recurrence]}</span>
                  </div>
                )}
                {requireCheck && (
                  <div className="flex items-center gap-1.5 text-sm text-mps-blue-600 bg-mps-blue-50 px-3 py-1.5 rounded-lg font-medium">
                    <ShieldCheck size={14} />
                    <span>Verification Required</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Assignees */}
          {!editing && task.assignees.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Assignees</h4>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map(a => (
                  <span key={a.id} className="text-xs bg-mps-blue-50 text-mps-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {a.user?.full_name || 'Unknown'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <CheckSquare size={14} />
              Checklist
              {task.checklist.length > 0 && (
                <span className="text-xs font-normal text-slate-500">
                  ({task.checklist.filter(c => c.is_completed).length}/{task.checklist.length})
                </span>
              )}
            </h4>
            <div className="space-y-1.5">
              {task.checklist.map(item => (
                <button
                  key={item.id}
                  onClick={() => onToggleChecklist(item.id, item.is_completed)}
                  className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {item.is_completed ? (
                    <CheckSquare size={16} className="text-mps-green-600 flex-shrink-0" />
                  ) : (
                    <Square size={16} className="text-slate-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item.text}
                  </span>
                </button>
              ))}
              {task.checklist.length === 0 && (
                <p className="text-xs text-slate-400 italic">No checklist items yet</p>
              )}
            </div>
            {!editing && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onAddCheckItem()}
                  placeholder="Add checklist item..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
                />
                <button onClick={onAddCheckItem} className="text-mps-blue-600 hover:text-mps-blue-700 p-1.5">
                  <CheckSquare size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Comments Thread */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <MessageSquare size={14} />
              Comments ({task.comments.length})
            </h4>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {task.comments.map(comment => (
                <div key={comment.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {comment.user?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-700">{comment.user?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  {comment.content && (
                    <p className="text-sm text-slate-600 pl-8">{comment.content}</p>
                  )}
                  {comment.attachment_url && (
                    <div className="pl-8 mt-1.5">
                      {comment.attachment_type === 'image' ? (
                        <a href={comment.attachment_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={comment.attachment_url}
                            alt={comment.attachment_name || 'Image'}
                            className="max-h-40 rounded-lg border border-slate-200 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : comment.attachment_type === 'link' ? (
                        <a
                          href={comment.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-mps-blue-600 hover:text-mps-blue-700 bg-mps-blue-50 px-3 py-1.5 rounded-lg border border-mps-blue-100"
                        >
                          <ExternalLink size={12} />
                          {comment.attachment_name || comment.attachment_url}
                        </a>
                      ) : (
                        <a
                          href={comment.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
                        >
                          <FileText size={12} />
                          {comment.attachment_name || 'Document'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {task.comments.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">No comments yet</p>
              )}
            </div>

            {/* Pending attachment preview */}
            {pendingAttachment && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {pendingAttachment.type === 'image' ? (
                  <ImageIcon size={14} className="text-mps-blue-500 flex-shrink-0" />
                ) : pendingAttachment.type === 'link' ? (
                  <Link2 size={14} className="text-mps-blue-500 flex-shrink-0" />
                ) : (
                  <FileText size={14} className="text-slate-500 flex-shrink-0" />
                )}
                <span className="text-xs text-slate-600 flex-1 truncate">{pendingAttachment.name}</span>
                <button onClick={() => setPendingAttachment(null)} className="p-0.5 text-slate-400 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Link input */}
            {showLinkInput && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') onAddLink(); if (e.key === 'Escape') setShowLinkInput(false) }}
                  placeholder="Paste a link..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
                  autoFocus
                />
                <button onClick={onAddLink} className="text-xs px-3 py-1.5 bg-mps-blue-500 text-white rounded-lg">Add</button>
                <button onClick={() => setShowLinkInput(false)} className="text-xs px-2 py-1.5 text-slate-500 hover:text-slate-700">Cancel</button>
              </div>
            )}

            {/* Comment input row */}
            <div className="flex items-center gap-2 mt-3">
              <input
                ref={commentFileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={onCommentFileChange}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => commentFileRef.current?.click()}
                  disabled={uploadingAttachment}
                  title="Attach file"
                  className="p-1.5 text-slate-400 hover:text-mps-blue-500 hover:bg-mps-blue-50 rounded-lg transition-colors"
                >
                  {uploadingAttachment ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                </button>
                <button
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  title="Add link"
                  className="p-1.5 text-slate-400 hover:text-mps-blue-500 hover:bg-mps-blue-50 rounded-lg transition-colors"
                >
                  <Link2 size={15} />
                </button>
              </div>
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !submitting && onAddComment()}
                placeholder="Write a comment..."
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
              />
              <button
                onClick={onAddComment}
                disabled={submitting || (!newComment.trim() && !pendingAttachment)}
                className="p-2 bg-mps-blue-500 text-white rounded-lg hover:bg-mps-blue-600 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
