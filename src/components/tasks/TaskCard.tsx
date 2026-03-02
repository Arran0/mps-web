'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'
import {
  TaskWithDetails,
  TaskStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  RECURRENCE_LABELS,
  getNextStatus,
  updateTaskStatus,
  updateTask,
  toggleChecklistItem,
  addComment,
  addChecklistItem,
  deleteTask,
  TaskRecurrence,
  TaskTag,
} from '@/lib/tasks'
import { useAuth } from '@/contexts/AuthContext'

interface TaskCardProps {
  task: TaskWithDetails
  canCheck: boolean
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onTaskDeleted?: (taskId: string) => void
  onTaskUpdated?: () => void
  compact?: boolean
}

export default function TaskCard({ task, canCheck, onStatusChange, onTaskDeleted, onTaskUpdated, compact }: TaskCardProps) {
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newCheckItem, setNewCheckItem] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleStatusTap = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = getNextStatus(task.status, canCheck)
    if (next === task.status) return
    const ok = await updateTaskStatus(task.id, next)
    if (ok) onStatusChange(task.id, next)
  }

  const handleToggleChecklist = async (itemId: string, current: boolean) => {
    await toggleChecklistItem(itemId, !current)
    onTaskUpdated?.()
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return
    setSubmitting(true)
    await addComment(task.id, user.id, newComment.trim())
    setNewComment('')
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
          {/* Status cycle button - tap to advance status */}
          <button
            onClick={handleStatusTap}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all active:scale-95 hover:shadow-md ${STATUS_COLORS[task.status]}`}
            title={`Tap to change status (${STATUS_LABELS[task.status]} → ${STATUS_LABELS[getNextStatus(task.status, canCheck)]})`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[task.status]}`} />
            {STATUS_LABELS[task.status]}
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
                  <Clock size={10} /> {task.timing}
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
            {totalChecklist > 0 && (
              <span className="text-xs text-slate-500">{completedChecklist}/{totalChecklist}</span>
            )}
            {task.comments.length > 0 && (
              <span className="text-xs text-slate-500 flex items-center gap-0.5">
                <MessageSquare size={10} /> {task.comments.length}
              </span>
            )}
            <ChevronRight size={14} className="text-slate-400" />
          </div>
        </div>

      </motion.div>

      {/* Full task modal - rendered via portal to avoid z-index issues */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <TaskModal
              task={task}
              canCheck={canCheck}
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
            />
          )}
        </AnimatePresence>,
        document.body
      )}
      </>
    )
  }

  // Full card (used directly sometimes)
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
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-semibold text-xs transition-all active:scale-95 hover:shadow-md ${STATUS_COLORS[task.status]}`}
            title={`Tap to change status (${STATUS_LABELS[task.status]} → ${STATUS_LABELS[getNextStatus(task.status, canCheck)]})`}
          >
            <div className={`w-3 h-3 rounded-full ${STATUS_DOT_COLORS[task.status]}`} />
            {STATUS_LABELS[task.status]}
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
                  <Clock size={12} /> {task.timing}
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
              {totalChecklist > 0 && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <CheckSquare size={12} /> {completedChecklist}/{totalChecklist}
                </span>
              )}
              {task.comments.length > 0 && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MessageSquare size={12} /> {task.comments.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full task modal - rendered via portal to avoid z-index issues */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <TaskModal
              task={task}
              canCheck={canCheck}
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
}

function TaskModal({
  task, canCheck, isOpen, onClose, onStatusTap,
  onToggleChecklist, onAddComment, onAddCheckItem, onDelete,
  onTaskUpdated,
  newComment, setNewComment, newCheckItem, setNewCheckItem,
  submitting, profile,
}: TaskModalProps) {
  const canEdit = profile && ['coordinator', 'principal', 'admin'].includes(profile.role)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')
  const [editDueDate, setEditDueDate] = useState(task.due_date || '')
  const [editTiming, setEditTiming] = useState(task.timing || '')
  const [editTag, setEditTag] = useState<TaskTag>(task.tag)
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>(task.recurrence || 'none')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    const ok = await updateTask(task.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      due_date: editDueDate || null,
      timing: editTiming || null,
      tag: editTag,
      recurrence: editRecurrence,
    })
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
    setEditTiming(task.timing || '')
    setEditTag(task.tag)
    setEditRecurrence(task.recurrence || 'none')
    setEditing(true)
  }

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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 hover:shadow-lg ${STATUS_COLORS[task.status]}`}
              title={`Tap to change status`}
            >
              <div className={`w-3.5 h-3.5 rounded-full ${STATUS_DOT_COLORS[task.status]} animate-pulse`} />
              {STATUS_LABELS[task.status]}
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
            // Edit Mode
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Timing</label>
                  <input
                    type="time"
                    value={editTiming}
                    onChange={e => setEditTiming(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 bg-white"
                  />
                </div>
              </div>

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
            // View Mode
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
                    <span>{task.timing}</span>
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
              </div>
            </>
          )}

          {/* Assignees */}
          {task.assignees.length > 0 && (
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
            </div>
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
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {comment.user?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-700">{comment.user?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 pl-8">{comment.content}</p>
                </div>
              ))}
              {task.comments.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">No comments yet</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
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
                disabled={submitting || !newComment.trim()}
                className="p-2 bg-mps-blue-500 text-white rounded-lg hover:bg-mps-blue-600 disabled:opacity-50 transition-colors"
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
