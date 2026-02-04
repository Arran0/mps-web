'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  ListOrdered,
  Calendar as CalendarIcon,
  FolderKanban,
} from 'lucide-react'
import ProjectCard from './ProjectCard'
import NewProjectForm from './NewProjectForm'
import {
  ProjectWithDetails,
  fetchProjectsForUser,
} from '@/lib/projects'
import {
  STATUS_DOT_COLORS,
  TaskStatus,
} from '@/lib/tasks'
import { UserProfile, UserRole } from '@/lib/supabase'

interface ProjectsListProps {
  userId: string
  userRole: UserRole
  canEdit: boolean
  canCheck: boolean
  availableAssignees: UserProfile[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

// Project bar colors for the calendar
const PROJECT_BAR_COLORS = [
  'bg-mps-blue-400',
  'bg-mps-green-400',
  'bg-purple-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-cyan-400',
  'bg-orange-400',
  'bg-teal-400',
]

function getProjectColor(index: number): string {
  return PROJECT_BAR_COLORS[index % PROJECT_BAR_COLORS.length]
}

function getProjectStatus(project: ProjectWithDetails): { label: string; color: string } {
  const total = project.subtasks.length
  if (total === 0) return { label: 'No subtasks', color: 'text-slate-400' }

  const checked = project.subtasks.filter(s => s.status === 'checked').length
  const done = project.subtasks.filter(s => s.status === 'done' || s.status === 'checked').length

  if (checked === total) return { label: 'Completed', color: 'text-blue-600' }
  if (done === total) return { label: 'All Done', color: 'text-green-600' }
  if (done > 0) return { label: 'In Progress', color: 'text-amber-600' }
  return { label: 'Not Started', color: 'text-slate-500' }
}

export default function ProjectsList({
  userId,
  userRole,
  canEdit,
  canCheck,
  availableAssignees,
}: ProjectsListProps) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const data = await fetchProjectsForUser(userId, userRole)
    setProjects(data)
    setLoading(false)
  }, [userId, userRole])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleProjectUpdated = async () => {
    await loadProjects()
    // If a project is open, refresh it
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id)
      // Will be picked up on next render via project prop
    }
  }

  // Re-select the updated project from the refreshed list
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id)
      if (updated) {
        setSelectedProject(updated)
      } else {
        setSelectedProject(null)
      }
    }
  }, [projects]) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // Monthly Calendar helpers
  // ============================================

  const calYear = calendarMonth.getFullYear()
  const calMonth = calendarMonth.getMonth()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const monthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const goToPrevMonth = () => {
    setCalendarMonth(new Date(calYear, calMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCalendarMonth(new Date(calYear, calMonth + 1, 1))
  }

  // Filter projects that overlap with this month
  const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
  const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const calendarProjects = projects.filter(p => {
    if (!p.start_date && !p.end_date) return false
    const pStart = p.start_date || p.end_date!
    const pEnd = p.end_date || p.start_date!
    // Check overlap: project range intersects with month range
    return pStart <= monthEnd && pEnd >= monthStart
  })

  const getDayNumber = (dateStr: string): number => {
    const parts = dateStr.split('-')
    return parseInt(parts[2], 10)
  }

  const isDateInMonth = (dateStr: string): boolean => {
    return dateStr >= monthStart && dateStr <= monthEnd
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
          <FolderKanban size={22} className="text-mps-blue-600" />
          Projects
        </h2>
        {canEdit && (
          <button
            onClick={() => setShowNewProject(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <FolderKanban size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No projects yet.</p>
          {canEdit && (
            <button
              onClick={() => setShowNewProject(true)}
              className="mt-3 text-sm text-mps-blue-600 hover:text-mps-blue-700 font-medium"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Projects List */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {projects.map((project) => {
              const status = getProjectStatus(project)
              const total = project.subtasks.length
              const done = project.subtasks.filter(
                s => s.status === 'done' || s.status === 'checked'
              ).length
              const progress = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <motion.div
                  key={project.id}
                  variants={itemVariants}
                  className="glass rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow card-hover"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {project.title}
                        </h3>
                        {project.sequential_mode && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium flex items-center gap-0.5 flex-shrink-0">
                            <ListOrdered size={10} /> Seq
                          </span>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-sm text-slate-500 truncate mb-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {(project.start_date || project.end_date) && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={11} />
                            {project.start_date || '?'} - {project.end_date || '?'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Mini progress bar */}
                      {total > 0 && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-mps-blue-500 to-mps-green-500 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {done}/{total}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Mini member avatars */}
                    <div className="flex -space-x-2 flex-shrink-0">
                      {project.members.slice(0, 4).map(m => (
                        <div
                          key={m.id}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-mps-blue-500 to-mps-green-500 flex items-center justify-center border-2 border-white"
                          title={m.user?.full_name || 'Unknown'}
                        >
                          <span className="text-white text-[9px] font-bold">
                            {m.user?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      ))}
                      {project.members.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white">
                          <span className="text-slate-600 text-[9px] font-bold">
                            +{project.members.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* ============================================ */}
          {/* Monthly Project Calendar */}
          {/* ============================================ */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon size={18} className="text-mps-blue-600" />
                Project Calendar
              </h3>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between glass rounded-xl p-3 mb-4">
              <button
                onClick={goToPrevMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="font-semibold text-slate-800">{monthLabel}</p>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {calendarProjects.length === 0 ? (
              <div className="glass rounded-xl p-6 text-center">
                <p className="text-sm text-slate-400">No projects with dates in this month.</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                {/* Day headers */}
                <div className="overflow-x-auto">
                  <div style={{ minWidth: `${Math.max(daysInMonth * 36 + 160, 600)}px` }}>
                    {/* Header row with day numbers */}
                    <div className="flex border-b border-slate-100">
                      <div className="w-40 flex-shrink-0 p-2 text-xs font-semibold text-slate-600 border-r border-slate-100">
                        Project
                      </div>
                      <div className="flex flex-1">
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const dayNum = i + 1
                          const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                          const isToday = dayStr === todayStr
                          const dayOfWeek = new Date(calYear, calMonth, dayNum).getDay()
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

                          return (
                            <div
                              key={dayNum}
                              className={`flex-1 min-w-[36px] text-center py-1.5 text-[10px] border-r border-slate-50 last:border-r-0 ${
                                isToday
                                  ? 'bg-mps-blue-50 text-mps-blue-700 font-bold'
                                  : isWeekend
                                    ? 'text-slate-400 bg-slate-50/50'
                                    : 'text-slate-500'
                              }`}
                            >
                              {dayNum}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Project rows */}
                    {calendarProjects.map((project, pIdx) => {
                      const barColor = getProjectColor(pIdx)
                      const pStart = project.start_date || project.end_date!
                      const pEnd = project.end_date || project.start_date!

                      // Gather subtask due dates for dots
                      const subtaskDueDays = new Set<number>()
                      const subtaskStatusByDay: Record<number, TaskStatus> = {}
                      project.subtasks.forEach(s => {
                        if (s.due_date && isDateInMonth(s.due_date)) {
                          const day = getDayNumber(s.due_date)
                          subtaskDueDays.add(day)
                          subtaskStatusByDay[day] = s.status
                        }
                      })

                      return (
                        <div
                          key={project.id}
                          className="flex border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedProject(project)}
                        >
                          {/* Project name */}
                          <div className="w-40 flex-shrink-0 p-2 text-xs font-medium text-slate-700 truncate border-r border-slate-100 flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${barColor}`} />
                            <span className="truncate">{project.title}</span>
                          </div>

                          {/* Day cells */}
                          <div className="flex flex-1">
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const dayNum = i + 1
                              const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                              const isInRange = dayStr >= pStart && dayStr <= pEnd
                              const isRangeStart = dayStr === pStart
                              const isRangeEnd = dayStr === pEnd
                              const hasSubtask = subtaskDueDays.has(dayNum)
                              const subtaskStatus = subtaskStatusByDay[dayNum]
                              const isToday = dayStr === todayStr

                              return (
                                <div
                                  key={dayNum}
                                  className={`flex-1 min-w-[36px] h-10 relative flex items-center justify-center border-r border-slate-50/50 last:border-r-0 ${
                                    isToday ? 'bg-mps-blue-50/30' : ''
                                  }`}
                                >
                                  {isInRange && (
                                    <div
                                      className={`absolute inset-y-2 inset-x-0 ${barColor} opacity-30 ${
                                        isRangeStart ? 'rounded-l-full ml-1' : ''
                                      } ${isRangeEnd ? 'rounded-r-full mr-1' : ''}`}
                                    />
                                  )}
                                  {hasSubtask && (
                                    <div
                                      className={`relative z-10 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                                        subtaskStatus ? STATUS_DOT_COLORS[subtaskStatus] : 'bg-slate-400'
                                      }`}
                                      title={`Subtask due ${dayStr}`}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectCard
          project={selectedProject}
          canEdit={canEdit}
          canCheck={canCheck}
          onClose={() => setSelectedProject(null)}
          onUpdated={handleProjectUpdated}
        />
      )}

      {/* New Project Modal */}
      <NewProjectForm
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onProjectCreated={() => { loadProjects(); setShowNewProject(false) }}
        currentUserId={userId}
        availableAssignees={availableAssignees}
      />
    </div>
  )
}
