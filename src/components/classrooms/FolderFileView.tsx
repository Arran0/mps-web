'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, File, Plus, Trash2, ChevronRight, ChevronDown, Clock,
  X, Circle, CircleDot, CheckCircle2, Users, Link2, FileText,
  Youtube, Upload, BarChart2, ExternalLink, Play, Edit3, Check,
} from 'lucide-react'
import {
  ClassroomFolder, ClassroomFile, FileProgress, FileSubmission,
  FolderType, FileStatus, SubmissionType, ClassroomWithDetails,
  createFolder, fetchFolders, deleteFolder, updateFolder,
  createFile, fetchFilesForFolder, deleteFile,
  updateFileProgress, fetchFileProgress, fetchProgressForStudent,
  fetchProgressForFiles,
  submitWork, fetchSubmissions, fetchStudentSubmission, fetchStudentMembers,
  ClassroomMember,
  extractYouTubeEmbedUrl, uploadClassroomFile, uploadSubmissionFile,
} from '@/lib/classrooms'
import { UserRole, UserProfile } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

interface FolderFileViewProps {
  classroomId: string
  userId: string
  userRole: UserRole
  type: FolderType
  classroom: ClassroomWithDetails
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_ICON: Record<FileStatus, React.ReactNode> = {
  not_done:  <Circle      size={18} className="text-red-400" />,
  partial:   <CircleDot   size={18} className="text-amber-500" />,
  done:      <CheckCircle2 size={18} className="text-blue-500" />,
  completed: <CheckCircle2 size={18} className="text-green-500" />,
}

const STATUS_LABEL: Record<FileStatus, string> = {
  not_done: 'Not Done',
  partial:  'Partial',
  done:     'Done',
  completed:'Completed',
}

const STATUS_BG: Record<FileStatus, string> = {
  not_done: 'bg-red-50 text-red-600 border-red-200',
  partial:  'bg-amber-50 text-amber-600 border-amber-200',
  done:     'bg-blue-50 text-blue-600 border-blue-200',
  completed:'bg-green-50 text-green-600 border-green-200',
}

function getNextStatus(
  current: FileStatus,
  isStaff: boolean,
  requiresCheck: boolean,
): FileStatus {
  if (isStaff) {
    const cycle: FileStatus[] = requiresCheck
      ? ['not_done', 'partial', 'done', 'completed']
      : ['not_done', 'partial', 'completed']
    return cycle[(cycle.indexOf(current) + 1) % cycle.length]
  }
  // Student — can never reach 'completed' on a requires_check file
  const cycle: FileStatus[] = requiresCheck
    ? ['not_done', 'partial', 'done']
    : ['not_done', 'partial', 'completed']
  return cycle[(cycle.indexOf(current) + 1) % cycle.length]
}

type AttachmentType = 'youtube' | 'image' | 'doc' | 'other'

const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'csv', 'rtf']
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']

function getAttachmentType(url: string, name: string | null): AttachmentType {
  if (extractYouTubeEmbedUrl(url)) return 'youtube'
  const ext = ((name || url).split('.').pop() || '').toLowerCase().split('?')[0]
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (DOC_EXTENSIONS.includes(ext)) return 'doc'
  return 'other'
}

/** Wrap a public URL in Google Docs Viewer for in-app rendering */
function googleDocsViewerUrl(url: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FolderFileView({
  classroomId, userId, userRole, type, classroom,
}: FolderFileViewProps) {
  const isStudent = userRole === 'student'
  const isStaff   = !isStudent
  const isHomework = type === 'homework'

  // Core data
  const [folders,           setFolders]           = useState<ClassroomFolder[]>([])
  const [expandedFolder,    setExpandedFolder]    = useState<string | null>(null)
  const [folderFiles,       setFolderFiles]       = useState<Record<string, ClassroomFile[]>>({})
  const [studentProgress,   setStudentProgress]   = useState<Record<string, FileStatus>>({})
  const [studentSubmissions,setStudentSubmissions]= useState<Record<string, FileSubmission>>({})
  const [loading,           setLoading]           = useState(true)

  // Staff per-folder progress
  const [students,              setStudents]              = useState<(ClassroomMember & { user: UserProfile })[]>([])
  const [folderAllProgress,     setFolderAllProgress]     = useState<Record<string, FileProgress[]>>({})
  const [showFolderProgress,    setShowFolderProgress]    = useState<string | null>(null)

  // Modals
  const [showNewFolder,   setShowNewFolder]   = useState(false)
  const [showNewFile,     setShowNewFile]     = useState<string | null>(null)
  const [showTracking,    setShowTracking]    = useState<string | null>(null)    // fileId
  const [trackingData,    setTrackingData]    = useState<{
    file: ClassroomFile | null
    progress: FileProgress[]
    submissions: FileSubmission[]
  }>({ file: null, progress: [], submissions: [] })
  const [trackingUpdating, setTrackingUpdating] = useState<string | null>(null)  // studentId
  const [showSubmit,      setShowSubmit]      = useState<string | null>(null)
  const [submitContent,   setSubmitContent]   = useState('')
  const [submitFile,      setSubmitFile]      = useState<File | null>(null)
  const [submittingWork,  setSubmittingWork]  = useState(false)
  const [videoUrl,        setVideoUrl]        = useState<string | null>(null)   // YouTube embed URL
  const [imageUrl,        setImageUrl]        = useState<string | null>(null)   // image lightbox
  const [docViewerUrl,    setDocViewerUrl]    = useState<string | null>(null)  // Google Docs viewer (PDFs, office docs)

  // Folder editing
  const [editingFolder,    setEditingFolder]    = useState<string | null>(null)
  const [editFolderTitle,  setEditFolderTitle]  = useState('')
  const [editFolderDesc,   setEditFolderDesc]   = useState('')
  const [editFolderDue,    setEditFolderDue]    = useState('')
  const [savingFolder,     setSavingFolder]     = useState(false)

  // New folder form
  const [newFolderTitle, setNewFolderTitle] = useState('')
  const [newFolderDesc,  setNewFolderDesc]  = useState('')
  const [newFolderDue,   setNewFolderDue]   = useState('')

  // New file form
  const [newFileTitle,               setNewFileTitle]               = useState('')
  const [newFileDesc,                setNewFileDesc]                = useState('')
  const [newFileDue,                 setNewFileDue]                 = useState('')
  const [newFileRequiresSubmission,  setNewFileRequiresSubmission]  = useState(false)
  const [newFileSubmissionType,      setNewFileSubmissionType]      = useState<SubmissionType>('text')
  const [newFileRequiresCheck,       setNewFileRequiresCheck]       = useState(false)
  const [newFileAttachmentMode,      setNewFileAttachmentMode]      = useState<'none' | 'youtube' | 'upload' | 'link'>('none')
  const [newFileYoutubeUrl,          setNewFileYoutubeUrl]          = useState('')
  const [newFileLinkUrl,             setNewFileLinkUrl]             = useState('')
  const [newFileUpload,              setNewFileUpload]              = useState<File | null>(null)
  const [uploadingFile,              setUploadingFile]              = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    setLoading(true)
    const data = await fetchFolders(classroomId, type)
    setFolders(data)
    setLoading(false)
  }, [classroomId, type])

  useEffect(() => { loadFolders() }, [loadFolders])

  // Load students once for staff
  useEffect(() => {
    if (isStaff) {
      fetchStudentMembers(classroomId).then(setStudents)
    }
  }, [isStaff, classroomId])

  const loadFiles = async (folderId: string) => {
    const files = await fetchFilesForFolder(folderId)
    setFolderFiles(prev => ({ ...prev, [folderId]: files }))

    if (files.length === 0) return

    if (isStudent) {
      const fileIds = files.map(f => f.id)
      const progress = await fetchProgressForStudent(userId, fileIds)
      const map: Record<string, FileStatus> = {}
      for (const p of progress) map[p.file_id] = p.status as FileStatus
      setStudentProgress(prev => ({ ...prev, ...map }))

      for (const f of files) {
        if (f.requires_submission) {
          const sub = await fetchStudentSubmission(f.id, userId)
          if (sub) setStudentSubmissions(prev => ({ ...prev, [f.id]: sub }))
        }
      }
    }

    if (isStaff) {
      const fileIds = files.map(f => f.id)
      const allProgress = await fetchProgressForFiles(fileIds)
      setFolderAllProgress(prev => ({ ...prev, [folderId]: allProgress }))
    }
  }

  const toggleFolder = (folderId: string) => {
    if (expandedFolder === folderId) {
      setExpandedFolder(null)
      setShowFolderProgress(null)
    } else {
      setExpandedFolder(folderId)
      setShowFolderProgress(null)
      if (!folderFiles[folderId]) {
        loadFiles(folderId)
      }
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderTitle.trim()) return
    const result = await createFolder({
      classroom_id: classroomId, type,
      title: newFolderTitle.trim(),
      description: newFolderDesc.trim() || undefined,
      due_date: newFolderDue || undefined,
    }, userId)
    if (result) {
      setFolders(prev => [result, ...prev])
      setNewFolderTitle(''); setNewFolderDesc(''); setNewFolderDue('')
      setShowNewFolder(false)
    }
  }

  const resetNewFileForm = () => {
    setNewFileTitle(''); setNewFileDesc(''); setNewFileDue('')
    setNewFileRequiresSubmission(false); setNewFileSubmissionType('text')
    setNewFileRequiresCheck(false)
    setNewFileAttachmentMode('none'); setNewFileYoutubeUrl(''); setNewFileUpload(null); setNewFileLinkUrl('')
  }

  const handleCreateFile = async (e: React.FormEvent, folderId: string) => {
    e.preventDefault()
    if (!newFileTitle.trim()) return

    setUploadingFile(true)
    let attachmentUrl: string | undefined
    let attachmentName: string | undefined

    if (newFileAttachmentMode === 'youtube' && newFileYoutubeUrl.trim()) {
      const embed = extractYouTubeEmbedUrl(newFileYoutubeUrl.trim())
      if (!embed) {
        alert('Invalid YouTube URL. Please use a youtube.com or youtu.be link.')
        setUploadingFile(false)
        return
      }
      attachmentUrl = newFileYoutubeUrl.trim()
    } else if (newFileAttachmentMode === 'link' && newFileLinkUrl.trim()) {
      attachmentUrl = newFileLinkUrl.trim()
      attachmentName = 'Link'
    } else if (newFileAttachmentMode === 'upload' && newFileUpload) {
      const uploaded = await uploadClassroomFile(classroomId, newFileUpload)
      if ('error' in uploaded) {
        alert(uploaded.error)
        setUploadingFile(false)
        return
      }
      attachmentUrl = uploaded.url
      attachmentName = uploaded.name
    }

    const result = await createFile({
      folder_id: folderId,
      title: newFileTitle.trim(),
      description: newFileDesc.trim() || undefined,
      due_date: newFileDue || undefined,
      requires_submission: newFileRequiresSubmission,
      submission_type: newFileRequiresSubmission ? newFileSubmissionType : undefined,
      requires_check: newFileRequiresCheck,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    }, userId)

    setUploadingFile(false)

    if (result) {
      setFolderFiles(prev => ({
        ...prev,
        [folderId]: [result, ...(prev[folderId] || [])],
      }))
      resetNewFileForm()
      setShowNewFile(null)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder and all its files?')) return
    if (await deleteFolder(folderId)) {
      setFolders(prev => prev.filter(f => f.id !== folderId))
    }
  }

  const openEditFolder = (folder: ClassroomFolder) => {
    setEditingFolder(folder.id)
    setEditFolderTitle(folder.title)
    setEditFolderDesc(folder.description || '')
    setEditFolderDue(folder.due_date || '')
  }

  const handleSaveFolder = async (folderId: string) => {
    if (!editFolderTitle.trim()) return
    setSavingFolder(true)
    const ok = await updateFolder(folderId, {
      title: editFolderTitle.trim(),
      description: editFolderDesc.trim() || null,
      due_date: editFolderDue || null,
    })
    setSavingFolder(false)
    if (ok) {
      setFolders(prev => prev.map(f =>
        f.id === folderId
          ? { ...f, title: editFolderTitle.trim(), description: editFolderDesc.trim() || null, due_date: editFolderDue || null }
          : f
      ))
      setEditingFolder(null)
    }
  }

  const handleDeleteFile = async (fileId: string, folderId: string) => {
    if (!confirm('Delete this file?')) return
    if (await deleteFile(fileId)) {
      setFolderFiles(prev => ({
        ...prev,
        [folderId]: (prev[folderId] || []).filter(f => f.id !== fileId),
      }))
    }
  }

  // ─── Progress / Status ─────────────────────────────────────────────────────

  const handleStatusToggle = async (fileId: string, file: ClassroomFile) => {
    const current = studentProgress[fileId] || 'not_done'

    // If requires submission and trying to advance past partial without submitting
    if (file.requires_submission && current === 'partial' && !studentSubmissions[fileId]) {
      setShowSubmit(fileId)
      return
    }

    // Students can't mark 'completed' on requires_check files
    const next = getNextStatus(current, false, file.requires_check)
    const success = await updateFileProgress(fileId, userId, next)
    if (success) setStudentProgress(prev => ({ ...prev, [fileId]: next }))
  }

  const handleTrackingStatusClick = async (
    fileId: string,
    studentId: string,
    currentStatus: FileStatus,
    requiresCheck: boolean,
  ) => {
    setTrackingUpdating(studentId)
    const next = getNextStatus(currentStatus, true, requiresCheck)
    const success = await updateFileProgress(fileId, studentId, next)
    if (success) {
      setTrackingData(prev => {
        const updated = prev.progress.filter(p => !(p.file_id === fileId && p.student_id === studentId))
        return {
          ...prev,
          progress: [...updated, { id: '', file_id: fileId, student_id: studentId, status: next, updated_at: new Date().toISOString() }],
        }
      })
      // Also refresh folder-level progress
      setFolderAllProgress(prev => {
        const folderId = Object.keys(folderFiles).find(fid =>
          (folderFiles[fid] || []).some(f => f.id === fileId)
        )
        if (!folderId) return prev
        const updated = (prev[folderId] || []).filter(
          p => !(p.file_id === fileId && p.student_id === studentId)
        )
        return {
          ...prev,
          [folderId]: [...updated, { id: '', file_id: fileId, student_id: studentId, status: next, updated_at: new Date().toISOString() }],
        }
      })
    }
    setTrackingUpdating(null)
  }

  const handleShowTracking = async (fileId: string) => {
    const file = Object.values(folderFiles).flat().find(f => f.id === fileId) ?? null
    setShowTracking(fileId)
    setTrackingData({ file, progress: [], submissions: [] })
    const [progress, submissions] = await Promise.all([
      fetchFileProgress(fileId),
      fetchSubmissions(fileId),
    ])
    setTrackingData({ file, progress, submissions })
  }

  const handleSubmitWork = async (fileId: string) => {
    const file = Object.values(folderFiles).flat().find(f => f.id === fileId)
    const subType = (file?.submission_type || 'text') as SubmissionType
    let content = submitContent.trim()

    if (subType === 'file') {
      if (!submitFile) return
      setSubmittingWork(true)
      const uploaded = await uploadSubmissionFile(fileId, userId, submitFile)
      if ('error' in uploaded) {
        setSubmittingWork(false)
        alert(uploaded.error)
        return
      }
      content = uploaded.url
    } else {
      if (!content) return
    }

    setSubmittingWork(true)
    const success = await submitWork(fileId, userId, content, subType)
    setSubmittingWork(false)
    if (success) {
      setStudentSubmissions(prev => ({
        ...prev,
        [fileId]: {
          id: '', file_id: fileId, student_id: userId,
          content, submission_type: subType,
          submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
      }))
      const next = getNextStatus('partial', false, file?.requires_check || false)
      await updateFileProgress(fileId, userId, next)
      setStudentProgress(prev => ({ ...prev, [fileId]: next }))
      setSubmitContent('')
      setSubmitFile(null)
      setShowSubmit(null)
    }
  }

  // ─── Computed helpers ──────────────────────────────────────────────────────

  const isOverdue = (d: string | null) =>
    !!d && new Date(d) < new Date(new Date().toDateString())

  const getStudentFolderStats = (folderId: string, studentId: string) => {
    const files  = folderFiles[folderId] || []
    const allProg = folderAllProgress[folderId] || []
    if (files.length === 0) return null
    const getStatus = (fileId: string): FileStatus =>
      (allProg.find(p => p.file_id === fileId && p.student_id === studentId)?.status as FileStatus) || 'not_done'
    const completed = files.filter(f => getStatus(f.id) === 'completed').length
    const done      = files.filter(f => ['done', 'completed'].includes(getStatus(f.id))).length
    return { completed, done, total: files.length }
  }

  const getFolderSummary = (folderId: string) => {
    // For student: own progress
    if (isStudent) {
      const files = folderFiles[folderId] || []
      if (files.length === 0) return null
      const completed = files.filter(f => studentProgress[f.id] === 'completed').length
      const done      = files.filter(f => ['done', 'completed'].includes(studentProgress[f.id] || 'not_done')).length
      return { completed, done, total: files.length }
    }
    return null
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mx-auto mb-3" />
        <p className="text-sm text-slate-500">
          Loading {type === 'coursework' ? 'course work' : 'homework'}...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* New Folder Button */}
      {isStaff && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New Folder
          </button>
        </div>
      )}

      {/* New Folder Form */}
      <AnimatePresence>
        {showNewFolder && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateFolder}
            className="glass rounded-2xl p-4 space-y-3 overflow-hidden"
          >
            <input
              type="text" value={newFolderTitle}
              onChange={e => setNewFolderTitle(e.target.value)}
              placeholder="Folder title"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              autoFocus
            />
            <textarea
              value={newFolderDesc}
              onChange={e => setNewFolderDesc(e.target.value)}
              placeholder="Description (optional)" rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
            <div className="flex items-center gap-3">
              <input type="date" value={newFolderDue}
                onChange={e => setNewFolderDue(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <div className="flex-1" />
              <button type="button" onClick={() => setShowNewFolder(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button type="submit" className="btn-primary text-sm px-4 py-2" disabled={!newFolderTitle.trim()}>Create</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Folders List */}
      {folders.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Folder size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            No {type === 'coursework' ? 'course work' : 'homework'} folders yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map(folder => {
            const isExpanded = expandedFolder === folder.id
            const files      = folderFiles[folder.id] || []
            const overdue    = isOverdue(folder.due_date)
            const summary    = isExpanded ? getFolderSummary(folder.id) : null

            return (
              <div key={folder.id} className="glass rounded-2xl overflow-hidden">
                {/* Folder Header */}
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  {isExpanded
                    ? <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                    : <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
                  }
                  <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0">
                    <Folder size={18} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 text-sm">{folder.title}</span>
                      {overdue && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full flex-shrink-0">Overdue</span>
                      )}
                    </div>
                    {folder.due_date && (
                      <span className={`sm:hidden text-xs flex items-center gap-1 mt-0.5 ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                        <Clock size={11} /> {new Date(folder.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {folder.description && (
                      <p className="text-xs text-slate-500 truncate">{folder.description}</p>
                    )}
                    {/* Student folder progress badge */}
                    {isStudent && summary && (
                      <p className="text-xs text-mps-blue-600 mt-0.5">
                        {summary.completed}/{summary.total} completed
                        {summary.done > summary.completed ? ` (${summary.done - summary.completed} pending check)` : ''}
                      </p>
                    )}
                  </div>
                  {folder.due_date && (
                    <span className={`hidden sm:flex text-xs items-center gap-1 flex-shrink-0 ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                      <Clock size={12} /> {new Date(folder.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {isStaff && (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openEditFolder(folder)}
                        className="p-1 text-slate-300 hover:text-mps-blue-500 transition-colors"
                        title="Edit folder"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </button>

                {/* Inline folder edit form */}
                {isStaff && editingFolder === folder.id && (
                  <div className="px-4 py-3 border-b border-slate-100 bg-mps-blue-50/30 space-y-2">
                    <input
                      type="text"
                      value={editFolderTitle}
                      onChange={e => setEditFolderTitle(e.target.value)}
                      placeholder="Folder title"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-400/50 bg-white"
                      autoFocus
                    />
                    <textarea
                      value={editFolderDesc}
                      onChange={e => setEditFolderDesc(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-400/50 resize-none bg-white"
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock size={12} /> Due:
                      </label>
                      <input
                        type="date"
                        value={editFolderDue}
                        onChange={e => setEditFolderDue(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-400/50 bg-white"
                      />
                      <div className="flex-1" />
                      <button
                        onClick={() => setEditingFolder(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                      >Cancel</button>
                      <button
                        onClick={() => handleSaveFolder(folder.id)}
                        disabled={savingFolder || !editFolderTitle.trim()}
                        className="flex items-center gap-1 text-xs bg-mps-blue-500 text-white rounded-lg px-3 py-1.5 hover:bg-mps-blue-600 disabled:opacity-50 transition-colors"
                      >
                        <Check size={12} /> {savingFolder ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden"
                    >
                      {/* Staff: per-folder progress bar */}
                      {isStaff && students.length > 0 && (
                        <div className="px-4 pt-3 pb-1">
                          <button
                            onClick={() => setShowFolderProgress(
                              showFolderProgress === folder.id ? null : folder.id
                            )}
                            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-mps-blue-600 transition-colors mb-2"
                          >
                            <BarChart2 size={13} />
                            Student Progress
                            {showFolderProgress === folder.id
                              ? <ChevronDown size={13} />
                              : <ChevronRight size={13} />
                            }
                          </button>

                          <AnimatePresence>
                            {showFolderProgress === folder.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-3"
                              >
                                {files.length === 0 ? (
                                  <p className="text-xs text-slate-400 pb-2">No files in this folder yet.</p>
                                ) : students.length === 0 ? (
                                  <p className="text-xs text-slate-400 pb-2">No students enrolled.</p>
                                ) : (
                                  <div className="space-y-1.5 bg-slate-50 rounded-xl p-3">
                                    {students.map(s => {
                                      const stats = getStudentFolderStats(folder.id, s.user_id)
                                      const pct   = stats ? Math.round((stats.completed / stats.total) * 100) : 0
                                      return (
                                        <div key={s.user_id} className="flex items-center gap-3">
                                          <Avatar avatarUrl={s.user.avatar_url} name={s.user.full_name} size={28} />
                                          <span className="text-xs font-medium text-slate-700 w-32 truncate flex-shrink-0">
                                            {s.user.full_name}
                                          </span>
                                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-green-500 rounded-full transition-all"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-slate-500 w-12 text-right flex-shrink-0">
                                            {stats ? `${stats.completed}/${stats.total}` : `0/${files.length}`}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="px-2 pb-2">
                        {/* Add File Button */}
                        {isStaff && (
                          <button
                            onClick={() => {
                              resetNewFileForm()
                              setShowNewFile(showNewFile === folder.id ? null : folder.id)
                            }}
                            className="flex items-center gap-2 text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium px-3 py-2"
                          >
                            <Plus size={14} /> Add File
                          </button>
                        )}

                        {/* New File Form */}
                        {showNewFile === folder.id && (
                          <form
                            onSubmit={e => handleCreateFile(e, folder.id)}
                            className="bg-slate-50 rounded-xl p-3 space-y-2.5 mb-2"
                          >
                            <input
                              type="text" value={newFileTitle}
                              onChange={e => setNewFileTitle(e.target.value)}
                              placeholder="File title"
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                              autoFocus
                            />
                            <textarea
                              value={newFileDesc}
                              onChange={e => setNewFileDesc(e.target.value)}
                              placeholder="Description (optional)" rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                              <input type="date" value={newFileDue}
                                onChange={e => setNewFileDue(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                              />
                              {/* Requires check */}
                              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newFileRequiresCheck}
                                  onChange={e => setNewFileRequiresCheck(e.target.checked)}
                                  className="rounded"
                                />
                                Requires staff check
                              </label>
                              {/* Requires submission */}
                              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newFileRequiresSubmission}
                                  onChange={e => setNewFileRequiresSubmission(e.target.checked)}
                                  className="rounded"
                                />
                                Require submission
                              </label>
                              {newFileRequiresSubmission && (
                                <select
                                  value={newFileSubmissionType}
                                  onChange={e => setNewFileSubmissionType(e.target.value as SubmissionType)}
                                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                >
                                  <option value="text">Text</option>
                                  <option value="link">Link</option>
                                  <option value="file">File Upload</option>
                                </select>
                              )}
                            </div>

                            {/* Attachment */}
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1.5">Attachment (optional)</p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {(['none', 'youtube', 'link', 'upload'] as const).map(mode => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setNewFileAttachmentMode(mode)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                      newFileAttachmentMode === mode
                                        ? 'bg-mps-blue-500 text-white border-mps-blue-500'
                                        : 'text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {mode === 'none'    && 'None'}
                                    {mode === 'youtube' && <><Youtube size={13} /> YouTube</>}
                                    {mode === 'link'    && <><Link2 size={13} /> Link</>}
                                    {mode === 'upload'  && <><Upload size={13} /> Upload</>}
                                  </button>
                                ))}
                              </div>
                              {newFileAttachmentMode === 'youtube' && (
                                <input
                                  type="url" value={newFileYoutubeUrl}
                                  onChange={e => setNewFileYoutubeUrl(e.target.value)}
                                  placeholder="https://youtube.com/watch?v=..."
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                              )}
                              {newFileAttachmentMode === 'link' && (
                                <input
                                  type="url" value={newFileLinkUrl}
                                  onChange={e => setNewFileLinkUrl(e.target.value)}
                                  placeholder="https://example.com/resource"
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                              )}
                              {newFileAttachmentMode === 'upload' && (
                                <div>
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={e => setNewFileUpload(e.target.files?.[0] || null)}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-mps-blue-400 hover:text-mps-blue-600 transition-colors w-full"
                                  >
                                    <Upload size={14} />
                                    {newFileUpload ? newFileUpload.name : 'Choose file (max 20 MB)'}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setShowNewFile(null)} className="text-sm text-slate-500">Cancel</button>
                              <button
                                type="submit"
                                className="btn-primary text-sm px-3 py-1.5"
                                disabled={!newFileTitle.trim() || uploadingFile}
                              >
                                {uploadingFile ? 'Uploading...' : 'Add'}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* File List */}
                        {files.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-4">No files in this folder</p>
                        )}

                        {files.map((file, fileIdx) => {
                          const status     = studentProgress[file.id] || 'not_done'
                          const submission = studentSubmissions[file.id]
                          const fileOverdue = isOverdue(file.due_date)
                          const hasAttachment = !!file.attachment_url
                          const attachType = hasAttachment ? getAttachmentType(file.attachment_url!, file.attachment_name) : 'other'
                          const embedUrl   = attachType === 'youtube' ? extractYouTubeEmbedUrl(file.attachment_url!) : null
                          const isYoutube  = attachType === 'youtube'

                          return (
                            <div
                              key={file.id}
                              className={`flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors group ${
                                fileIdx < files.length - 1 ? 'border-b border-slate-100' : ''
                              }`}
                            >
                              {/* Student: Status Toggle */}
                              {isStudent && (
                                <button
                                  onClick={() => handleStatusToggle(file.id, file)}
                                  className="flex-shrink-0 mt-0.5"
                                  title={STATUS_LABEL[status]}
                                >
                                  {STATUS_ICON[status]}
                                </button>
                              )}

                              {/* Staff: File Icon */}
                              {isStaff && (
                                <div className="flex-shrink-0 mt-0.5 p-1 bg-mps-blue-50 rounded">
                                  <File size={14} className="text-mps-blue-500" />
                                </div>
                              )}

                              {/* File Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${
                                    isStudent && status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'
                                  }`}>
                                    {file.title}
                                  </span>
                                  {/* Status badge (student only) */}
                                  {isStudent && status !== 'not_done' && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_BG[status]}`}>
                                      {STATUS_LABEL[status]}
                                    </span>
                                  )}
                                  {fileOverdue && (!isStudent || status !== 'completed') && (
                                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">Overdue</span>
                                  )}
                                  {file.requires_submission && (
                                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full flex items-center gap-0.5">
                                      {file.submission_type === 'link' ? <Link2 size={10} /> : <FileText size={10} />}
                                      {isStudent && submission ? 'Submitted' : isStudent ? 'Submit required' : `Submit (${file.submission_type || 'text'})`}
                                    </span>
                                  )}
                                  {file.requires_check && (
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                                      Staff check
                                    </span>
                                  )}
                                </div>
                                {file.description && (
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{file.description}</p>
                                )}
                                {/* Attachment button */}
                                {hasAttachment && (
                                  attachType === 'other' && file.attachment_name === 'Link' ? (
                                    <a
                                      href={file.attachment_url!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1.5 text-xs text-mps-blue-600 hover:text-mps-blue-700 font-medium"
                                    >
                                      <ExternalLink size={11} /> Open Link
                                    </a>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (attachType === 'youtube') setVideoUrl(embedUrl)
                                        else if (attachType === 'image') setImageUrl(file.attachment_url!)
                                        else if (attachType === 'doc') setDocViewerUrl(googleDocsViewerUrl(file.attachment_url!))
                                        else window.open(file.attachment_url!, '_blank')
                                      }}
                                      className="mt-1 flex items-center gap-1.5 text-xs text-mps-blue-600 hover:text-mps-blue-700 font-medium"
                                    >
                                      {attachType === 'youtube' && <><Play size={11} /> Watch Video</>}
                                      {attachType === 'image'   && <><ExternalLink size={11} /> View Image</>}
                                      {attachType === 'doc'     && <><ExternalLink size={11} /> {file.attachment_name || 'View Document'}</>}
                                      {attachType === 'other'   && <><ExternalLink size={11} /> {file.attachment_name || 'View Attachment'}</>}
                                    </button>
                                  )
                                )}
                              </div>

                              {/* Due Date */}
                              {file.due_date && (
                                <span className={`text-xs flex-shrink-0 self-start mt-0.5 ${
                                  fileOverdue && (!isStudent || status !== 'completed') ? 'text-red-500' : 'text-slate-400'
                                }`}>
                                  {new Date(file.due_date).toLocaleDateString()}
                                </span>
                              )}

                              {/* Staff: Track + Delete */}
                              {isStaff && (
                                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleShowTracking(file.id)}
                                    className="p-1 text-slate-400 hover:text-mps-blue-600 transition-colors"
                                    title="Student tracking"
                                  >
                                    <Users size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFile(file.id, folder.id)}
                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Submit Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowSubmit(null); setSubmitContent('') }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800">Submit Your Work</h3>
              {(() => {
                const file = Object.values(folderFiles).flat().find(f => f.id === showSubmit)
                const subType = file?.submission_type || 'text'
                const isReady = subType === 'file' ? !!submitFile : !!submitContent.trim()
                return (
                  <>
                    <p className="text-sm text-slate-500">
                      {subType === 'link' ? 'Paste your link below:' : subType === 'file' ? 'Upload your file:' : 'Enter your submission:'}
                    </p>
                    {subType === 'link' && (
                      <input
                        type="url" value={submitContent}
                        onChange={e => setSubmitContent(e.target.value)}
                        placeholder="https://..."
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        autoFocus
                      />
                    )}
                    {subType === 'text' && (
                      <textarea
                        value={submitContent}
                        onChange={e => setSubmitContent(e.target.value)}
                        placeholder="Type your answer..." rows={5}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                        autoFocus
                      />
                    )}
                    {subType === 'file' && (
                      <div>
                        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-purple-400 transition-colors bg-slate-50">
                          <Upload size={24} className="text-slate-400" />
                          <span className="text-sm text-slate-600 text-center">
                            {submitFile ? submitFile.name : 'Click to choose a file'}
                          </span>
                          {submitFile && (
                            <span className="text-xs text-slate-400">
                              {(submitFile.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          )}
                          <input type="file" className="hidden" onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowSubmit(null); setSubmitContent(''); setSubmitFile(null) }}
                        className="text-sm text-slate-500 px-4 py-2"
                      >Cancel</button>
                      <button
                        onClick={() => handleSubmitWork(showSubmit!)}
                        className="btn-primary text-sm px-4 py-2"
                        disabled={!isReady || submittingWork}
                      >{submittingWork ? 'Uploading…' : 'Submit'}</button>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tracking Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showTracking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTracking(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-800">Student Tracking</h3>
                <button onClick={() => setShowTracking(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              {trackingData.file && (
                <p className="text-sm text-slate-500 mb-4">{trackingData.file.title}</p>
              )}

              {/* Status legend */}
              {trackingData.file && (
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                  {trackingData.file.requires_check ? (
                    <>
                      <span className="flex items-center gap-1"><Circle size={12} className="text-red-400" /> Not Done</span>
                      <span className="flex items-center gap-1"><CircleDot size={12} className="text-amber-500" /> Partial</span>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-blue-500" /> Done (awaiting check)</span>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Completed</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1"><Circle size={12} className="text-red-400" /> Not Done</span>
                      <span className="flex items-center gap-1"><CircleDot size={12} className="text-amber-500" /> Partial</span>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Completed</span>
                    </>
                  )}
                  <span className="text-slate-400 ml-auto">Click status to change</span>
                </div>
              )}

              {students.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No students in this classroom</p>
              ) : (
                <div className="space-y-2">
                  {students.map(member => {
                    const prog   = trackingData.progress.find(p => p.student_id === member.user_id)
                    const sub    = trackingData.submissions.find(s => s.student_id === member.user_id)
                    const status : FileStatus = (prog?.status as FileStatus) || 'not_done'
                    const isUpdating = trackingUpdating === member.user_id
                    const requiresCheck = trackingData.file?.requires_check || false

                    return (
                      <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <Avatar avatarUrl={member.user.avatar_url} name={member.user.full_name} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">{member.user.full_name}</p>
                          {sub && sub.submission_type === 'text' && (
                            <p className="text-xs text-purple-600 truncate">
                              {sub.content.substring(0, 60)}{sub.content.length > 60 ? '…' : ''}
                            </p>
                          )}
                          {sub && sub.submission_type === 'link' && (
                            <a href={sub.content} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-mps-blue-600 hover:underline truncate block">
                              {sub.content.substring(0, 60)}{sub.content.length > 60 ? '…' : ''}
                            </a>
                          )}
                          {sub && sub.submission_type === 'file' && (
                            <a href={sub.content} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                              <ExternalLink size={10} /> View Submitted File
                            </a>
                          )}
                        </div>
                        {/* Interactive status button */}
                        <button
                          onClick={() => !isUpdating && handleTrackingStatusClick(
                            showTracking!, member.user_id, status, requiresCheck
                          )}
                          disabled={isUpdating}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${STATUS_BG[status]} hover:opacity-80 disabled:opacity-50`}
                          title="Click to change status"
                        >
                          {isUpdating
                            ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            : STATUS_ICON[status]
                          }
                          {STATUS_LABEL[status]}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── YouTube Video Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {videoUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
            onClick={() => setVideoUrl(null)}
          >
            <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setVideoUrl(null)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl">
                <iframe
                  src={videoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image Lightbox ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {imageUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
            onClick={() => setImageUrl(null)}
          >
            <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setImageUrl(null)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <img
                src={imageUrl}
                alt="Attachment"
                className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Document Viewer (Google Docs — PDF, Word, PPT, Excel, etc.) ─── */}
      <AnimatePresence>
        {docViewerUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/90"
            onClick={() => setDocViewerUrl(null)}
          >
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <p className="text-white/70 text-sm">Document Viewer</p>
              <button
                onClick={() => setDocViewerUrl(null)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 px-4 pb-4" onClick={e => e.stopPropagation()}>
              <iframe
                src={docViewerUrl}
                className="w-full h-full rounded-xl shadow-2xl bg-white"
                title="Document Viewer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
