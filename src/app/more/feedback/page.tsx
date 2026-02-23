'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Paperclip,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Reply,
  Clock,
  CheckCircle,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Filter,
  FileText,
  ImageIcon,
  File,
} from 'lucide-react'
import Link from 'next/link'
import {
  FeedbackWithDetails,
  NewFeedbackInput,
  submitFeedback,
  fetchMyFeedbacks,
  fetchAllFeedbacks,
  replyToFeedback,
  deleteFeedback,
  getSignedFileUrl,
  formatFileSize,
  validateFile,
} from '@/lib/feedback'

// ---------- helpers ----------

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <ImageIcon size={14} />
  }
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
    return <FileText size={14} />
  }
  return <File size={14} />
}

type FilterType = 'all' | 'pending' | 'replied'

// ---------- File Download Button ----------

interface FileDownloadButtonProps {
  filePath: string
  fileName: string
  fileSize: number | null
}

function FileDownloadButton({ filePath, fileName, fileSize }: FileDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    const url = await getSignedFileUrl(filePath)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-mps-blue-600 hover:text-mps-blue-700 bg-mps-blue-50 hover:bg-mps-blue-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {getFileIcon(fileName)}
      <span className="max-w-[160px] truncate">{fileName}</span>
      {fileSize != null && (
        <span className="text-slate-400 flex-shrink-0">({formatFileSize(fileSize)})</span>
      )}
      <Download size={12} className="flex-shrink-0" />
      {loading && <span className="flex-shrink-0 text-slate-400">…</span>}
    </button>
  )
}

// ---------- New Feedback Form ----------

interface NewFeedbackFormProps {
  onSubmitted: () => void
  userId: string
}

function NewFeedbackForm({ onSubmitted, userId }: NewFeedbackFormProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setFileError(null)
    if (selected) {
      const err = validateFile(selected)
      if (err) { setFileError(err); return }
    }
    setFile(selected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSubmitting(true)
    setError(null)

    const input: NewFeedbackInput = { subject, message, file: file || undefined }
    const { error: submitError } = await submitFeedback(input, userId)

    if (submitError) {
      setError(submitError)
      setSubmitting(false)
      return
    }

    setSubject('')
    setMessage('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onSubmitted()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Brief subject of your feedback"
          required
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your feedback, suggestion, or concern in detail…"
          rows={5}
          required
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 resize-none"
        />
      </div>

      {/* File attachment */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          Attachment{' '}
          <span className="text-slate-400 font-normal">(optional — max 10 MB)</span>
        </label>
        {file ? (
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {getFileIcon(file.name)}
            <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{file.name}</span>
            <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(file.size)}</span>
            <button
              type="button"
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors w-full"
          >
            <Paperclip size={15} />
            Click to attach a file
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip"
        />
        {fileError && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {fileError}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !subject.trim() || !message.trim()}
        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send size={15} />
            Submit Feedback
          </>
        )}
      </button>
    </form>
  )
}

// ---------- User Feedback Card ----------

function UserFeedbackCard({ feedback }: { feedback: FeedbackWithDetails }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex-shrink-0 p-1.5 rounded-lg ${feedback.reply ? 'bg-green-100' : 'bg-amber-100'}`}>
            {feedback.reply
              ? <CheckCircle size={14} className="text-green-600" />
              : <Clock size={14} className="text-amber-600" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{feedback.subject}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatRelativeDate(feedback.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            feedback.reply ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {feedback.reply ? 'Replied' : 'Pending'}
          </span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your Message</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{feedback.message}</p>
              </div>

              {feedback.file_url && feedback.file_name && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Attachment</p>
                  <FileDownloadButton
                    filePath={feedback.file_url}
                    fileName={feedback.file_name}
                    fileSize={feedback.file_size}
                  />
                </div>
              )}

              {feedback.reply ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Reply size={14} className="text-green-600" />
                    <p className="text-xs font-semibold text-green-700">
                      Admin Reply
                      {feedback.replied_at && (
                        <span className="font-normal text-green-600 ml-2">
                          · {formatRelativeDate(feedback.replied_at)}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{feedback.reply}</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <Clock size={13} />
                    Your feedback is awaiting a response from the admin.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ---------- Admin Feedback Card ----------

interface AdminFeedbackCardProps {
  feedback: FeedbackWithDetails
  adminId: string
  onDeleted: (id: string) => void
  onReplied: (id: string, reply: string) => void
}

function AdminFeedbackCard({ feedback, adminId, onDeleted, onReplied }: AdminFeedbackCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [replyText, setReplyText] = useState(feedback.reply || '')
  const [editing, setEditing] = useState(!feedback.reply)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const handleReply = async () => {
    if (!replyText.trim()) return
    setSaving(true)
    setReplyError(null)
    const ok = await replyToFeedback(feedback.id, replyText, adminId)
    if (ok) {
      onReplied(feedback.id, replyText.trim())
      setEditing(false)
    } else {
      setReplyError('Failed to save reply. Please try again.')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const ok = await deleteFeedback(feedback.id)
    if (ok) onDeleted(feedback.id)
    setDeleting(false)
  }

  const submitter = feedback.submitter
  const initials = submitter?.full_name?.charAt(0)?.toUpperCase() || '?'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 text-sm">{submitter?.full_name || 'Unknown'}</p>
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">
                {submitter?.role || '—'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{feedback.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            feedback.reply ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {feedback.reply ? 'Replied' : 'Pending'}
          </span>
          <p className="text-xs text-slate-400 hidden sm:block">{formatRelativeDate(feedback.created_at)}</p>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
              {/* Submitter meta */}
              <p className="text-xs text-slate-400">
                {submitter?.email} · {new Date(feedback.created_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>

              {/* Message */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message</p>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{feedback.message}</p>
                </div>
              </div>

              {/* File */}
              {feedback.file_url && feedback.file_name && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Attachment</p>
                  <FileDownloadButton
                    filePath={feedback.file_url}
                    fileName={feedback.file_name}
                    fileSize={feedback.file_size}
                  />
                </div>
              )}

              {/* Reply */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reply</p>
                  {feedback.reply && !editing && (
                    <button
                      onClick={e => { e.stopPropagation(); setEditing(true) }}
                      className="text-xs text-mps-blue-600 hover:underline"
                    >
                      Edit reply
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-2" onClick={e => e.stopPropagation()}>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write your reply…"
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 focus:border-mps-blue-500 resize-none"
                    />
                    {replyError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> {replyError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleReply}
                        disabled={saving || !replyText.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-mps-blue-600 text-white rounded-xl text-sm font-medium hover:bg-mps-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : <Send size={13} />}
                        {saving ? 'Saving…' : 'Send Reply'}
                      </button>
                      {feedback.reply && (
                        <button
                          onClick={() => { setEditing(false); setReplyText(feedback.reply || '') }}
                          className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{feedback.reply}</p>
                    {feedback.replied_at && (
                      <p className="text-xs text-green-600 mt-1.5">
                        Replied {formatRelativeDate(feedback.replied_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Delete */}
              <div className="pt-1 border-t border-slate-100">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-slate-600 flex-1">Delete this feedback permanently?</p>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {deleting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={12} />}
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete feedback
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ---------- Main Page ----------

export default function FeedbackPage() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [feedbacks, setFeedbacks] = useState<FeedbackWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  const loadFeedbacks = useCallback(async () => {
    if (!user || !profile) return
    setLoading(true)
    const data = isAdmin
      ? await fetchAllFeedbacks()
      : await fetchMyFeedbacks(user.id)
    setFeedbacks(data)
    setLoading(false)
  }, [user, profile, isAdmin])

  useEffect(() => { loadFeedbacks() }, [loadFeedbacks])

  const handleSubmitted = () => {
    setShowForm(false)
    loadFeedbacks()
  }

  const handleDeleted = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id))
  }

  const handleReplied = (id: string, reply: string) => {
    setFeedbacks(prev => prev.map(f =>
      f.id === id
        ? { ...f, reply, replied_by: user!.id, replied_at: new Date().toISOString() }
        : f
    ))
  }

  const pendingCount = feedbacks.filter(f => !f.reply).length
  const repliedCount = feedbacks.filter(f => !!f.reply).length

  const filtered = feedbacks.filter(f => {
    if (filter === 'pending') return !f.reply
    if (filter === 'replied') return !!f.reply
    return true
  })

  return (
    <ProtectedLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <Link
              href="/more"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
            >
              <ArrowLeft size={15} />
              Back to More
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl shadow-lg">
                  <MessageSquare className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-slate-800">
                    {isAdmin ? 'All Feedback' : 'Feedback'}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {isAdmin
                      ? 'Review and respond to feedback from users'
                      : 'Share your thoughts, suggestions, or concerns'}
                  </p>
                </div>
              </div>

              {!isAdmin && (
                <button
                  onClick={() => setShowForm(p => !p)}
                  className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
                >
                  {showForm ? <X size={15} /> : <MessageSquare size={15} />}
                  {showForm ? 'Cancel' : 'New Feedback'}
                </button>
              )}
            </div>

            {/* Admin stats */}
            {isAdmin && feedbacks.length > 0 && (
              <div className="flex gap-3 mt-4">
                <div className="flex-1 glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-800">{feedbacks.length}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="flex-1 glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
                <div className="flex-1 glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{repliedCount}</p>
                  <p className="text-xs text-slate-500">Replied</p>
                </div>
              </div>
            )}
          </div>

          {/* New Feedback Form (user only) */}
          <AnimatePresence>
            {showForm && user && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare size={17} className="text-indigo-500" />
                  New Feedback
                </h2>
                <NewFeedbackForm userId={user.id} onSubmitted={handleSubmitted} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter tabs (admin only) */}
          {isAdmin && feedbacks.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              {(['all', 'pending', 'replied'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all'
                    ? `All (${feedbacks.length})`
                    : f === 'pending'
                    ? `Pending (${pendingCount})`
                    : `Replied (${repliedCount})`}
                </button>
              ))}
            </div>
          )}

          {/* Feedback list */}
          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading feedback…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <MessageSquare size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                {filter !== 'all'
                  ? `No ${filter} feedback.`
                  : isAdmin
                  ? 'No feedback received yet.'
                  : 'You haven\'t submitted any feedback yet.'}
              </p>
              {!isAdmin && !showForm && filter === 'all' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Submit your first feedback
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map(f =>
                  isAdmin ? (
                    <AdminFeedbackCard
                      key={f.id}
                      feedback={f}
                      adminId={user!.id}
                      onDeleted={handleDeleted}
                      onReplied={handleReplied}
                    />
                  ) : (
                    <UserFeedbackCard key={f.id} feedback={f} />
                  )
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
