'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ClipboardList, Star, Calendar, X, Save, AlertCircle } from 'lucide-react'
import {
  ClassroomAssessment, AssessmentMark, AssessmentTag,
  createAssessment, fetchAssessments, deleteAssessment,
  upsertAssessmentMark, fetchAssessmentMarks, fetchStudentMembers,
  ClassroomMember, ClassroomWithDetails,
} from '@/lib/classrooms'
import { UserRole, UserProfile } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

interface AssessmentsTabProps {
  classroomId: string
  userId: string
  userRole: UserRole
  classroom: ClassroomWithDetails
}

export default function AssessmentsTab({ classroomId, userId, userRole, classroom }: AssessmentsTabProps) {
  const [assessments, setAssessments] = useState<ClassroomAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [showMarksheet, setShowMarksheet] = useState<string | null>(null)
  const [marks, setMarks] = useState<Record<string, { marks: string; max_marks: string }>>({})
  const [students, setStudents] = useState<(ClassroomMember & { user: UserProfile })[]>([])
  const [saving, setSaving] = useState(false)

  // New assessment form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTag, setNewTag] = useState<AssessmentTag>('other')

  const isStudent = userRole === 'student'
  const isStaff = ['teacher', 'coordinator', 'principal', 'admin'].includes(userRole)

  const loadAssessments = useCallback(async () => {
    setLoading(true)
    const data = await fetchAssessments(classroomId)
    setAssessments(data)
    setLoading(false)
  }, [classroomId])

  useEffect(() => { loadAssessments() }, [loadAssessments])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const result = await createAssessment({
      classroom_id: classroomId,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      date: newDate || undefined,
      tag: newTag,
    }, userId)

    if (result) {
      setAssessments((prev) => [result, ...prev])
      setNewTitle('')
      setNewDesc('')
      setNewDate('')
      setNewTag('other')
      setShowNewForm(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assessment?')) return
    const success = await deleteAssessment(id)
    if (success) {
      setAssessments((prev) => prev.filter((a) => a.id !== id))
    }
  }

  const handleOpenMarksheet = async (assessmentId: string) => {
    setShowMarksheet(assessmentId)
    const [existingMarks, studentList] = await Promise.all([
      fetchAssessmentMarks(assessmentId),
      fetchStudentMembers(classroomId),
    ])
    setStudents(studentList)

    const marksMap: Record<string, { marks: string; max_marks: string }> = {}
    for (const student of studentList) {
      const existing = existingMarks.find((m) => m.student_id === student.user_id)
      marksMap[student.user_id] = {
        marks: existing?.marks != null ? String(existing.marks) : '',
        max_marks: existing?.max_marks != null ? String(existing.max_marks) : '100',
      }
    }
    setMarks(marksMap)
  }

  const handleSaveMarks = async (assessmentId: string) => {
    setSaving(true)
    for (const [studentId, mark] of Object.entries(marks)) {
      const marksVal = mark.marks.trim() === '' ? null : parseFloat(mark.marks)
      const maxMarksVal = parseFloat(mark.max_marks) || 100
      await upsertAssessmentMark(assessmentId, studentId, marksVal, maxMarksVal)
    }
    setSaving(false)
    setShowMarksheet(null)
  }

  // Student view: fetch own marks
  const [studentMarks, setStudentMarks] = useState<Record<string, AssessmentMark>>({})
  useEffect(() => {
    if (isStudent && assessments.length > 0) {
      const loadMarks = async () => {
        for (const a of assessments) {
          const allMarks = await fetchAssessmentMarks(a.id)
          const mine = allMarks.find((m) => m.student_id === userId)
          if (mine) setStudentMarks((prev) => ({ ...prev, [a.id]: mine }))
        }
      }
      loadMarks()
    }
  }, [isStudent, assessments, userId])

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading assessments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* New Assessment Button */}
      {isStaff && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New Assessment
          </button>
        </div>
      )}

      {/* New Assessment Form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="glass rounded-2xl p-4 space-y-3"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Assessment title"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              autoFocus
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value as AssessmentTag)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              >
                <option value="other">Regular</option>
                <option value="main">Main (appears in Grades)</option>
              </select>
              <div className="flex-1" />
              <button type="button" onClick={() => setShowNewForm(false)} className="text-sm text-slate-500">Cancel</button>
              <button type="submit" className="btn-primary text-sm px-4 py-2" disabled={!newTitle.trim()}>Create</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <ClipboardList size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No assessments yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assessments.map((assessment) => {
            const myMark = studentMarks[assessment.id]

            return (
              <div key={assessment.id} className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${assessment.tag === 'main' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    {assessment.tag === 'main' ? <Star size={18} className="text-amber-600" /> : <ClipboardList size={18} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-800">{assessment.title}</h3>
                      {assessment.tag === 'main' && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Main</span>
                      )}
                    </div>
                    {assessment.description && <p className="text-sm text-slate-500 mt-1">{assessment.description}</p>}
                    {assessment.date && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} /> {new Date(assessment.date).toLocaleDateString()}
                      </p>
                    )}
                    {/* Student: Show marks */}
                    {isStudent && myMark && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-mps-blue-50 rounded-lg">
                        <span className="text-sm font-bold text-mps-blue-700">{myMark.marks ?? '—'}</span>
                        <span className="text-xs text-mps-blue-500">/ {myMark.max_marks}</span>
                      </div>
                    )}
                    {isStudent && !myMark && (
                      <p className="text-xs text-slate-400 mt-2">Marks not yet available</p>
                    )}
                  </div>
                  {/* Staff actions */}
                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenMarksheet(assessment.id)}
                        className="p-2 text-mps-blue-600 hover:bg-mps-blue-50 rounded-lg transition-colors text-xs font-medium"
                      >
                        Marksheet
                      </button>
                      <button
                        onClick={() => handleDelete(assessment.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Marksheet Modal */}
      <AnimatePresence>
        {showMarksheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMarksheet(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-100 p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold text-slate-800">Assessment Marksheet</h3>
                <button onClick={() => setShowMarksheet(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {students.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No students in this classroom</p>
                ) : (
                  <>
                    {students.map((student) => {
                      const mark = marks[student.user_id] || { marks: '', max_marks: '100' }
                      return (
                        <div key={student.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                          <Avatar avatarUrl={student.user.avatar_url} name={student.user.full_name} size={32} />
                          <span className="flex-1 text-sm font-medium text-slate-700 truncate">{student.user.full_name}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={mark.marks}
                              onChange={(e) => setMarks((prev) => ({
                                ...prev,
                                [student.user_id]: { ...mark, marks: e.target.value },
                              }))}
                              placeholder="—"
                              className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            <span className="text-slate-400 text-sm">/</span>
                            <input
                              type="number"
                              value={mark.max_marks}
                              onChange={(e) => setMarks((prev) => ({
                                ...prev,
                                [student.user_id]: { ...mark, max_marks: e.target.value },
                              }))}
                              className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                          </div>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => handleSaveMarks(showMarksheet)}
                      disabled={saving}
                      className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
                    >
                      <Save size={16} /> {saving ? 'Saving...' : 'Save Marks'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
