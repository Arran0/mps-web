'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Calendar,
  Clock,
  Tag,
  FileText,
  Users,
  Trash2,
  Repeat,
  ShieldCheck,
} from 'lucide-react'
import { createTask, NewTaskInput, TaskTag, TaskRecurrence, RECURRENCE_LABELS } from '@/lib/tasks'
import { UserProfile } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

interface NewTaskFormProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated: () => void
  currentUserId: string
  defaultAssigneeId?: string
  defaultDate?: string
  availableAssignees?: UserProfile[]
  canAssignToOthers: boolean
}

export default function NewTaskForm({
  isOpen,
  onClose,
  onTaskCreated,
  currentUserId,
  defaultAssigneeId,
  defaultDate,
  availableAssignees = [],
  canAssignToOthers,
}: NewTaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(defaultDate || '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [requireCheck, setRequireCheck] = useState(false)
  const [tag, setTag] = useState<TaskTag>(null)
  const [bonusPoints, setBonusPoints] = useState<number>(0)
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none')
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    [defaultAssigneeId || currentUserId]
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDueDate(defaultDate || '')
      setSelectedAssignees([defaultAssigneeId || currentUserId])
    }
  }, [isOpen, defaultDate, defaultAssigneeId, currentUserId])

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim()) return
    setChecklistItems([...checklistItems, newCheckItem.trim()])
    setNewCheckItem('')
  }

  const handleRemoveCheckItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index))
  }

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    const input: NewTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      timing: startTime || undefined,
      end_time: endTime || undefined,
      require_check: requireCheck,
      tag,
      bonus_points: bonusPoints,
      recurrence,
      assignee_ids: selectedAssignees.length > 0 ? selectedAssignees : [defaultAssigneeId || currentUserId],
      checklist_items: checklistItems.length > 0 ? checklistItems : undefined,
    }

    const task = await createTask(input, currentUserId)
    setSubmitting(false)

    if (task) {
      setTitle('')
      setDescription('')
      setDueDate(defaultDate || '')
      setStartTime('')
      setEndTime('')
      setRequireCheck(false)
      setTag(null)
      setBonusPoints(0)
      setRecurrence('none')
      setChecklistItems([])
      setSelectedAssignees([defaultAssigneeId || currentUserId])
      onTaskCreated()
      onClose()
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">New Task</h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <FileText size={14} /> Description
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Task description..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 resize-none"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={14} /> Due Date
                </label>
                <div className="hidden sm:flex gap-2 mb-2">
                  {[
                    { label: 'Today', value: todayStr },
                    { label: 'Tomorrow', value: tomorrowStr },
                    { label: 'Next Week', value: nextWeekStr },
                    { label: 'None', value: '' },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDueDate(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        dueDate === opt.value
                          ? 'bg-mps-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                />
              </div>

              {/* Start Time / End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Clock size={14} /> Start Time
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="hidden sm:flex gap-1.5 mb-2 flex-wrap">
                    {[
                      { label: '9 AM', value: '09:00' },
                      { label: '12 PM', value: '12:00' },
                      { label: '3 PM', value: '15:00' },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setStartTime(opt.value)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                          startTime === opt.value
                            ? 'bg-mps-blue-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Clock size={14} /> End Time
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="hidden sm:flex gap-1.5 mb-2 flex-wrap">
                    {[
                      { label: '1 PM', value: '13:00' },
                      { label: '5 PM', value: '17:00' },
                      { label: '6 PM', value: '18:00' },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setEndTime(opt.value)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                          endTime === opt.value
                            ? 'bg-mps-blue-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
                  />
                </div>
              </div>

              {/* Recurrence & Tag row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Repeat size={14} /> Repeat
                  </label>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as TaskRecurrence)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 bg-white"
                  >
                    {(Object.keys(RECURRENCE_LABELS) as TaskRecurrence[]).map(r => (
                      <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Tag size={14} /> Bonus Points
                  </label>
                  <select
                    value={bonusPoints}
                    onChange={e => setBonusPoints(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 bg-white"
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

              {/* Require Check toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={requireCheck ? 'text-mps-blue-600' : 'text-slate-400'} />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Require Verification</p>
                    <p className="text-xs text-slate-400">
                      {requireCheck
                        ? 'Status: Not Done → Partial → Awaiting Check → Completed'
                        : 'Status: Not Done → Partial → Completed'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireCheck(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    requireCheck ? 'bg-mps-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      requireCheck ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Assignees (only for coordinator/principal/admin) */}
              {canAssignToOthers && availableAssignees.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <Users size={14} /> Assignees
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    {availableAssignees.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleAssignee(user.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left text-sm ${
                          selectedAssignees.includes(user.id)
                            ? 'bg-mps-blue-50 text-mps-blue-700 border border-mps-blue-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Avatar avatarUrl={user.avatar_url} name={user.full_name} size={24} />
                        <span>{user.full_name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{user.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                  Checklist
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                {checklistItems.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {checklistItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                        <span className="text-sm text-slate-700 flex-1">{item}</span>
                        <button type="button" onClick={() => handleRemoveCheckItem(i)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCheckItem() } }}
                    placeholder="Add checklist item..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-mps-blue-500"
                  />
                  <button type="button" onClick={handleAddCheckItem} className="p-1.5 text-mps-blue-600 hover:bg-mps-blue-50 rounded-lg">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
