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
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
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

function getProjectStatus(project: ProjectWithDetails): { label: string; color: string; isCompleted: boolean; isOverdue: boolean } {
  const total = project.subtasks.length
  const todayStr = new Date().toISOString().split('T')[0]

  if (total === 0) return { label: 'No subtasks', color: 'text-slate-400', isCompleted: false, isOverdue: false }

  const checked = project.subtasks.filter(s => s.status === 'checked').length
  const done = project.subtasks.filter(s => s.status === 'done' || s.status === 'checked').length
  const isCompleted = checked === total
  const isOverdue = !isCompleted && !!project.end_date && project.end_date < todayStr

  if (isCompleted) return { label: 'Completed', color: 'text-blue-600', isCompleted: true, isOverdue: false }
  if (isOverdue) return { label: 'Overdue', color: 'text-red-600', isCompleted: false, isOverdue: true }
  if (done === total) return { label: 'All Done', color: 'text-green-600', isCompleted: false, isOverdue: false }
  if (done > 0) return { label: 'In Progress', color: 'text-amber-600', isCompleted: false, isOverdue: false }
  return { label: 'Not Started', color: 'text-slate-500', isCompleted: false, isOverdue: false }
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
  const [showClosedProjects, setShowClosedProjects] = useState(false)
  const [closedSearch, setClosedSearch] = useState('')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const data = await fetchProjectsForUser(userId, userRole)
    setProjects(data)
    setLoading(false)
  }, [userId, userRole])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleProjectUpdated = async () => {
    await loadProjects()
  }

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

  // Separate active and completed projects
  const activeProjects: (ProjectWithDetails & { _status: ReturnType<typeof getProjectStatus> })[] = []
  const completedProjects: (ProjectWithDetails & { _status: ReturnType<typeof getProjectStatus> })[] = []

  projects.forEach(p => {
    const status = getProjectStatus(p)
    if (status.isCompleted) {
      completedProjects.push({ ...p, _status: status })
    } else {
      activeProjects.push({ ...p, _status: status })
    }
  })

  // Sort active: overdue first, then by end_date
  activeProjects.sort((a, b) => {
    if (a._status.isOverdue && !b._status.isOverdue) return -1
    if (!a._status.isOverdue && b._status.isOverdue) return 1
    return 0
  })

  // Filter completed projects by search
  const filteredClosed = closedSearch.trim()
    ? completedProjects.filter(p =>
        p.title.toLowerCase().includes(closedSearch.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(closedSearch.toLowerCase())
      )
    : completedProjects

  // ============================================
  // Monthly Calendar helpers
  // ============================================

  const calYear = calendarMonth.getFullYear()
  const calMonth = calendarMonth.getMonth()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const monthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const goToPrevMonth = () => setCalendarMonth(new Date(calYear, calMonth - 1, 1))
  const goToNextMonth = () => setCalendarMonth(new Date(calYear, calMonth + 1, 1))

  const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
  const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const calendarProjects = projects.filter(p => {
    if (!p.start_date && !p.end_date) return false
    const pStart = p.start_date || p.end_date!
    const pEnd = p.end_date || p.start_date!
    return pStart <= monthEnd && pEnd >= monthStart
  })

  const getDayNumber = (dateStr: string): number => parseInt(dateStr.split('-')[2], 10)
  const isDateInMonth = (dateStr: string): boolean => dateStr >= monthStart && dateStr <= monthEnd
  const todayStr = new Date().toISOString().split('T')[0]

  const renderProjectCard = (project: ProjectWithDetails & { _status: ReturnType<typeof getProjectStatus> }) => {
    const total = project.subtasks.length
    const done = project.subtasks.filter(s => s.status === 'done' || s.status === 'checked').length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    return (
      <motion.div
        key={project.id}
        variants={itemVariants}
        className={`glass rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow card-hover ${
          project._status.isOverdue ? 'border-l-4 border-l-red-400' : ''
        } ${project._status.isCompleted ? 'opacity-70' : ''}`}
        onClick={() => setSelectedProject(project)}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold truncate ${
                project._status.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
              }`}>
                {project.title}
              </h3>
              {project.sequential_mode && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium flex items-center gap-0.5 flex-shrink-0">
                  <ListOrdered size={10} /> Seq
                </span>
              )}
              {project._status.isOverdue && (
                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium flex items-center gap-0.5 flex-shrink-0">
                  <AlertTriangle size={10} /> Overdue
                </span>
              )}
              {project._status.isCompleted && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex items-center gap-0.5 flex-shrink-0">
                  <CheckCircle2 size={10} /> Done
                </span>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-slate-500 truncate mb-2">{project.description}</p>
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
              <span className={`font-medium ${project._status.color}`}>
                {project._status.label}
              </span>
            </div>

            {total > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-mps-blue-500 to-mps-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{done}/{total}</span>
              </div>
            )}
          </div>

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
                <span className="text-slate-600 text-[9px] font-bold">+{project.members.length - 4}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

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
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {activeProjects.map(p => renderProjectCard(p))}
            </motion.div>
          )}

          {/* Recently Completed */}
          {completedProjects.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowClosedProjects(!showClosedProjects)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium mb-3"
              >
                {showClosedProjects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <CheckCircle2 size={14} className="text-blue-500" />
                Completed Projects ({completedProjects.length})
              </button>

              {showClosedProjects && (
                <div className="space-y-3">
                  {/* Search/filter */}
                  {completedProjects.length > 3 && (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={closedSearch}
                        onChange={e => setClosedSearch(e.target.value)}
                        placeholder="Search completed projects..."
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50"
                      />
                    </div>
                  )}

                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                    {filteredClosed.map(p => renderProjectCard(p))}
                    {filteredClosed.length === 0 && closedSearch && (
                      <p className="text-sm text-slate-400 text-center py-4">No matching projects</p>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {/* Monthly Project Calendar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon size={18} className="text-mps-blue-600" />
                Project Calendar
              </h3>
            </div>

            <div className="flex items-center justify-center gap-1 mb-4">
              <button onClick={goToPrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-600 px-2">{monthLabel}</span>
              <button onClick={goToNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            {calendarProjects.length === 0 ? (
              <div className="glass rounded-xl p-6 text-center">
                <p className="text-sm text-slate-400">No projects with dates in this month.</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <div style={{ minWidth: `${Math.max(daysInMonth * 36 + 160, 600)}px` }}>
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
                                isToday ? 'bg-mps-blue-50 text-mps-blue-700 font-bold' :
                                isWeekend ? 'text-slate-400 bg-slate-50/50' : 'text-slate-500'
                              }`}
                            >
                              {dayNum}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {calendarProjects.map((project, pIdx) => {
                      const barColor = getProjectColor(pIdx)
                      const pStart = project.start_date || project.end_date!
                      const pEnd = project.end_date || project.start_date!
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
                          <div className="w-40 flex-shrink-0 p-2 text-xs font-medium text-slate-700 truncate border-r border-slate-100 flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${barColor}`} />
                            <span className="truncate">{project.title}</span>
                          </div>
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
