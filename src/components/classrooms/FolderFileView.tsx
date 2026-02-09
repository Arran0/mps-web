'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, File, Plus, Trash2, ChevronRight, ChevronDown, Clock, Check,
  AlertCircle, X, Circle, CircleDot, CheckCircle2, Users, Link2, FileText
} from 'lucide-react'
import {
  ClassroomFolder, ClassroomFile, FileProgress, FileSubmission,
  FolderType, FileStatus, SubmissionType, ClassroomWithDetails,
  createFolder, fetchFolders, deleteFolder,
  createFile, fetchFilesForFolder, deleteFile,
  updateFileProgress, fetchFileProgress, fetchProgressForStudent,
  submitWork, fetchSubmissions, fetchStudentSubmission, fetchStudentMembers,
  ClassroomMember,
} from '@/lib/classrooms'
import { UserRole, UserProfile } from '@/lib/supabase'

interface FolderFileViewProps {
  classroomId: string
  userId: string
  userRole: UserRole
  type: FolderType
  classroom: ClassroomWithDetails
}

const STATUS_ICON: Record<FileStatus, React.ReactNode> = {
  not_done: <Circle size={18} className="text-slate-300" />,
  partial: <CircleDot size={18} className="text-amber-500" />,
  done: <CheckCircle2 size={18} className="text-green-500" />,
}

const STATUS_LABEL: Record<FileStatus, string> = {
  not_done: 'Not Done',
  partial: 'Partial',
  done: 'Done',
}

const NEXT_STATUS: Record<FileStatus, FileStatus> = {
  not_done: 'partial',
  partial: 'done',
  done: 'not_done',
}

export default function FolderFileView({ classroomId, userId, userRole, type, classroom }: FolderFileViewProps) {
  const [folders, setFolders] = useState<ClassroomFolder[]>([])
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null)
  const [folderFiles, setFolderFiles] = useState<Record<string, ClassroomFile[]>>({})
  const [studentProgress, setStudentProgress] = useState<Record<string, FileStatus>>({})
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, FileSubmission>>({})
  const [loading, setLoading] = useState(true)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showNewFile, setShowNewFile] = useState<string | null>(null)
  const [showTracking, setShowTracking] = useState<string | null>(null)
  const [trackingData, setTrackingData] = useState<{ progress: FileProgress[]; submissions: FileSubmission[]; students: (ClassroomMember & { user: UserProfile })[] }>({ progress: [], submissions: [], students: [] })
  const [showSubmit, setShowSubmit] = useState<string | null>(null)
  const [submitContent, setSubmitContent] = useState('')

  // Form states
  const [newFolderTitle, setNewFolderTitle] = useState('')
  const [newFolderDesc, setNewFolderDesc] = useState('')
  const [newFolderDue, setNewFolderDue] = useState('')
  const [newFileTitle, setNewFileTitle] = useState('')
  const [newFileDesc, setNewFileDesc] = useState('')
  const [newFileDue, setNewFileDue] = useState('')
  const [newFileRequiresSubmission, setNewFileRequiresSubmission] = useState(false)
  const [newFileSubmissionType, setNewFileSubmissionType] = useState<SubmissionType>('text')

  const isStudent = userRole === 'student'
  const isStaff = ['teacher', 'coordinator', 'principal', 'admin'].includes(userRole)
  const isHomework = type === 'homework'

  const loadFolders = useCallback(async () => {
    setLoading(true)
    const data = await fetchFolders(classroomId, type)
    setFolders(data)
    setLoading(false)
  }, [classroomId, type])

  useEffect(() => { loadFolders() }, [loadFolders])

  const loadFiles = async (folderId: string) => {
    const files = await fetchFilesForFolder(folderId)
    setFolderFiles((prev) => ({ ...prev, [folderId]: files }))

    // Load student's own progress
    if (isStudent && files.length > 0) {
      const fileIds = files.map((f) => f.id)
      const progress = await fetchProgressForStudent(userId, fileIds)
      const map: Record<string, FileStatus> = {}
      for (const p of progress) map[p.file_id] = p.status as FileStatus
      setStudentProgress((prev) => ({ ...prev, ...map }))

      // Load student's own submissions
      if (isHomework) {
        for (const f of files) {
          if (f.requires_submission) {
            const sub = await fetchStudentSubmission(f.id, userId)
            if (sub) setStudentSubmissions((prev) => ({ ...prev, [f.id]: sub }))
          }
        }
      }
    }
  }

  const toggleFolder = (folderId: string) => {
    if (expandedFolder === folderId) {
      setExpandedFolder(null)
    } else {
      setExpandedFolder(folderId)
      if (!folderFiles[folderId]) {
        loadFiles(folderId)
      }
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderTitle.trim()) return

    const result = await createFolder({
      classroom_id: classroomId,
      type,
      title: newFolderTitle.trim(),
      description: newFolderDesc.trim() || undefined,
      due_date: newFolderDue || undefined,
    }, userId)

    if (result) {
      setFolders((prev) => [result, ...prev])
      setNewFolderTitle('')
      setNewFolderDesc('')
      setNewFolderDue('')
      setShowNewFolder(false)
    }
  }

  const handleCreateFile = async (e: React.FormEvent, folderId: string) => {
    e.preventDefault()
    if (!newFileTitle.trim()) return

    const result = await createFile({
      folder_id: folderId,
      title: newFileTitle.trim(),
      description: newFileDesc.trim() || undefined,
      due_date: newFileDue || undefined,
      requires_submission: isHomework ? newFileRequiresSubmission : false,
      submission_type: isHomework && newFileRequiresSubmission ? newFileSubmissionType : undefined,
    }, userId)

    if (result) {
      setFolderFiles((prev) => ({
        ...prev,
        [folderId]: [result, ...(prev[folderId] || [])],
      }))
      setNewFileTitle('')
      setNewFileDesc('')
      setNewFileDue('')
      setNewFileRequiresSubmission(false)
      setShowNewFile(null)
    }
  }

  const handleStatusToggle = async (fileId: string, currentFile: ClassroomFile) => {
    const current = studentProgress[fileId] || 'not_done'

    // If homework requires submission and trying to mark as done without submission
    if (isHomework && currentFile.requires_submission && current === 'partial' && !studentSubmissions[fileId]) {
      setShowSubmit(fileId)
      return
    }

    const next = NEXT_STATUS[current]
    const success = await updateFileProgress(fileId, userId, next)
    if (success) {
      setStudentProgress((prev) => ({ ...prev, [fileId]: next }))
    }
  }

  const handleSubmitWork = async (fileId: string) => {
    if (!submitContent.trim()) return

    const file = Object.values(folderFiles).flat().find((f) => f.id === fileId)
    const subType = file?.submission_type || 'text'

    const success = await submitWork(fileId, userId, submitContent.trim(), subType as SubmissionType)
    if (success) {
      setStudentSubmissions((prev) => ({
        ...prev,
        [fileId]: {
          id: '',
          file_id: fileId,
          student_id: userId,
          content: submitContent.trim(),
          submission_type: subType as SubmissionType,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }))
      // Auto-mark as done after submission
      await updateFileProgress(fileId, userId, 'done')
      setStudentProgress((prev) => ({ ...prev, [fileId]: 'done' }))
      setSubmitContent('')
      setShowSubmit(null)
    }
  }

  const handleShowTracking = async (fileId: string) => {
    setShowTracking(fileId)
    const [progress, submissions, students] = await Promise.all([
      fetchFileProgress(fileId),
      fetchSubmissions(fileId),
      fetchStudentMembers(classroomId),
    ])
    setTrackingData({ progress, submissions, students })
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder and all its files?')) return
    const success = await deleteFolder(folderId)
    if (success) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId))
    }
  }

  const handleDeleteFile = async (fileId: string, folderId: string) => {
    if (!confirm('Delete this file?')) return
    const success = await deleteFile(fileId)
    if (success) {
      setFolderFiles((prev) => ({
        ...prev,
        [folderId]: (prev[folderId] || []).filter((f) => f.id !== fileId),
      }))
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date(new Date().toDateString())
  }

  // Compute folder completion for student
  const getFolderCompletion = (folderId: string) => {
    const files = folderFiles[folderId] || []
    if (files.length === 0) return null
    const doneCount = files.filter((f) => studentProgress[f.id] === 'done').length
    return { done: doneCount, total: files.length }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading {type === 'coursework' ? 'course work' : 'homework'}...</p>
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
            className="glass rounded-2xl p-4 space-y-3"
          >
            <input
              type="text"
              value={newFolderTitle}
              onChange={(e) => setNewFolderTitle(e.target.value)}
              placeholder="Folder title"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              autoFocus
            />
            <textarea
              value={newFolderDesc}
              onChange={(e) => setNewFolderDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={newFolderDue}
                onChange={(e) => setNewFolderDue(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Due date (optional)"
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
          <p className="text-slate-500 text-sm">No {type === 'coursework' ? 'course work' : 'homework'} folders yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map((folder) => {
            const isExpanded = expandedFolder === folder.id
            const files = folderFiles[folder.id] || []
            const completion = isStudent ? getFolderCompletion(folder.id) : null
            const overdue = isOverdue(folder.due_date)

            return (
              <div key={folder.id} className="glass rounded-2xl overflow-hidden">
                {/* Folder Header */}
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <Folder size={18} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">{folder.title}</span>
                      {overdue && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Overdue</span>}
                    </div>
                    {folder.description && <p className="text-xs text-slate-500 truncate">{folder.description}</p>}
                  </div>
                  {folder.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                      <Clock size={12} /> {new Date(folder.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {completion && (
                    <span className="text-xs font-medium text-mps-blue-600 bg-mps-blue-50 px-2 py-1 rounded-lg">
                      {completion.done}/{completion.total}
                    </span>
                  )}
                  {isStaff && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </button>

                {/* Expanded: Files */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100"
                    >
                      <div className="p-3 space-y-1">
                        {/* Add File Button */}
                        {isStaff && (
                          <button
                            onClick={() => setShowNewFile(showNewFile === folder.id ? null : folder.id)}
                            className="flex items-center gap-2 text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium px-3 py-2"
                          >
                            <Plus size={14} /> Add File
                          </button>
                        )}

                        {/* New File Form */}
                        {showNewFile === folder.id && (
                          <form onSubmit={(e) => handleCreateFile(e, folder.id)} className="bg-slate-50 rounded-xl p-3 space-y-2 mb-2">
                            <input
                              type="text"
                              value={newFileTitle}
                              onChange={(e) => setNewFileTitle(e.target.value)}
                              placeholder="File title"
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                              autoFocus
                            />
                            <textarea
                              value={newFileDesc}
                              onChange={(e) => setNewFileDesc(e.target.value)}
                              placeholder="Description (optional)"
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            />
                            <div className="flex items-center gap-3 flex-wrap">
                              <input
                                type="date"
                                value={newFileDue}
                                onChange={(e) => setNewFileDue(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                              />
                              {isHomework && (
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={newFileRequiresSubmission}
                                    onChange={(e) => setNewFileRequiresSubmission(e.target.checked)}
                                    className="rounded"
                                  />
                                  Require submission
                                </label>
                              )}
                              {isHomework && newFileRequiresSubmission && (
                                <select
                                  value={newFileSubmissionType}
                                  onChange={(e) => setNewFileSubmissionType(e.target.value as SubmissionType)}
                                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                >
                                  <option value="text">Text</option>
                                  <option value="link">Link</option>
                                </select>
                              )}
                            </div>
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setShowNewFile(null)} className="text-sm text-slate-500">Cancel</button>
                              <button type="submit" className="btn-primary text-sm px-3 py-1.5" disabled={!newFileTitle.trim()}>Add</button>
                            </div>
                          </form>
                        )}

                        {/* File List */}
                        {files.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-4">No files in this folder</p>
                        )}
                        {files.map((file) => {
                          const status = studentProgress[file.id] || 'not_done'
                          const submission = studentSubmissions[file.id]
                          const fileOverdue = isOverdue(file.due_date)

                          return (
                            <div
                              key={file.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                            >
                              {/* Student: Status Toggle */}
                              {isStudent && (
                                <button
                                  onClick={() => handleStatusToggle(file.id, file)}
                                  className="flex-shrink-0"
                                  title={STATUS_LABEL[status]}
                                >
                                  {STATUS_ICON[status]}
                                </button>
                              )}

                              {/* Staff: File Icon */}
                              {isStaff && (
                                <div className="flex-shrink-0 p-1 bg-mps-blue-50 rounded">
                                  <File size={14} className="text-mps-blue-500" />
                                </div>
                              )}

                              {/* File Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                    {file.title}
                                  </span>
                                  {fileOverdue && status !== 'done' && (
                                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">Overdue</span>
                                  )}
                                  {isHomework && file.requires_submission && (
                                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full flex items-center gap-0.5">
                                      {file.submission_type === 'link' ? <Link2 size={10} /> : <FileText size={10} />}
                                      {submission ? 'Submitted' : 'Submission required'}
                                    </span>
                                  )}
                                </div>
                                {file.description && <p className="text-xs text-slate-400 truncate">{file.description}</p>}
                              </div>

                              {/* Due Date */}
                              {file.due_date && (
                                <span className={`text-xs flex-shrink-0 ${fileOverdue && status !== 'done' ? 'text-red-500' : 'text-slate-400'}`}>
                                  {new Date(file.due_date).toLocaleDateString()}
                                </span>
                              )}

                              {/* Staff: Tracking Button */}
                              {isStaff && (
                                <button
                                  onClick={() => handleShowTracking(file.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-mps-blue-600 transition-all"
                                  title="View tracking"
                                >
                                  <Users size={14} />
                                </button>
                              )}

                              {/* Staff: Delete */}
                              {isStaff && (
                                <button
                                  onClick={() => handleDeleteFile(file.id, folder.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
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

      {/* Submission Modal */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSubmit(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-800">Submit Your Work</h3>
              {(() => {
                const file = Object.values(folderFiles).flat().find((f) => f.id === showSubmit)
                return (
                  <>
                    <p className="text-sm text-slate-500">
                      {file?.submission_type === 'link' ? 'Paste your link below:' : 'Enter your submission:'}
                    </p>
                    {file?.submission_type === 'link' ? (
                      <input
                        type="url"
                        value={submitContent}
                        onChange={(e) => setSubmitContent(e.target.value)}
                        placeholder="https://..."
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        autoFocus
                      />
                    ) : (
                      <textarea
                        value={submitContent}
                        onChange={(e) => setSubmitContent(e.target.value)}
                        placeholder="Type your answer..."
                        rows={5}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                        autoFocus
                      />
                    )}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowSubmit(null); setSubmitContent('') }} className="text-sm text-slate-500 px-4 py-2">Cancel</button>
                      <button
                        onClick={() => handleSubmitWork(showSubmit)}
                        className="btn-primary text-sm px-4 py-2"
                        disabled={!submitContent.trim()}
                      >
                        Submit
                      </button>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracking Modal */}
      <AnimatePresence>
        {showTracking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTracking(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Student Tracking</h3>
                <button onClick={() => setShowTracking(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              {trackingData.students.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No students in this classroom</p>
              ) : (
                <div className="space-y-2">
                  {trackingData.students.map((member) => {
                    const progress = trackingData.progress.find((p) => p.student_id === member.user_id)
                    const submission = trackingData.submissions.find((s) => s.student_id === member.user_id)
                    const status: FileStatus = (progress?.status as FileStatus) || 'not_done'

                    return (
                      <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white text-xs font-medium">
                          {member.user.full_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{member.user.full_name}</p>
                          {submission && (
                            <p className="text-xs text-purple-600">
                              Submitted: {submission.content.substring(0, 50)}{submission.content.length > 50 ? '...' : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {STATUS_ICON[status]}
                          <span className={`text-xs font-medium ${
                            status === 'done' ? 'text-green-600' :
                            status === 'partial' ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            {STATUS_LABEL[status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
