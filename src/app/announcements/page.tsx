'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { Megaphone, Plus } from 'lucide-react'
import AnnouncementsList from '@/components/announcements/AnnouncementsList'
import { fetchTeamsForUser, fetchAllTeams } from '@/lib/announcements'

// Team-name → grade range mapping (must match how teams are seeded in the DB)
const TEAM_GRADE_MAP: Record<string, number[]> = {
  'a': [1, 2, 3, 4, 5],
  'b': [6, 7, 8],
  'c': [9, 10, 11, 12],
}

function gradesForTeamName(name: string): number[] {
  const lower = name.toLowerCase()
  for (const [key, grades] of Object.entries(TEAM_GRADE_MAP)) {
    if (lower.includes(`team ${key}`) || lower === key) return grades
  }
  return []
}

export default function AnnouncementsPage() {
  const { user, profile } = useAuth()

  const [userTeams, setUserTeams] = useState<{ id: string; name: string }[]>([])
  const [allTeams,  setAllTeams]  = useState<{ id: string; name: string }[]>([])
  const [teamsLoaded, setTeamsLoaded] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)

  const canCreate = profile ? ['coordinator', 'principal', 'admin'].includes(profile.role) : false

  const loadTeams = useCallback(async () => {
    if (!user || !profile) return

    const tasks: Promise<void>[] = []

    // Coordinator: load their own teams (for audience picker + grade limit)
    if (profile.role === 'coordinator') {
      tasks.push(fetchTeamsForUser(user.id).then(setUserTeams))
    }

    // Principal / Admin: load all teams (full audience picker)
    if (profile.role === 'principal' || profile.role === 'admin') {
      tasks.push(fetchAllTeams().then(setAllTeams))
    }

    await Promise.all(tasks)
    setTeamsLoaded(true)
  }, [user, profile])

  useEffect(() => { loadTeams() }, [loadTeams])

  // Compute grade ranges per team for the coordinator's grade picker
  const teamGradeRanges = useMemo(() => {
    const teams = [...userTeams, ...allTeams]
    const unique = Array.from(new Map(teams.map(t => [t.id, t])).values())
    return unique
      .map(team => ({ teamId: team.id, grades: gradesForTeamName(team.name) }))
      .filter(r => r.grades.length > 0)
  }, [userTeams, allTeams])

  if (!user || !profile) return null

  // Students and teachers don't need teams to load — show immediately
  const waitForTeams = ['coordinator', 'principal', 'admin'].includes(profile.role)

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-mps-blue-400 to-purple-500 rounded-xl shadow-lg">
                <Megaphone className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-800">Announcements</h1>
                <p className="text-slate-500 text-sm">Stay updated with the latest news</p>
              </div>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> New Announcement
              </button>
            )}
          </div>
        </div>

        {waitForTeams && !teamsLoaded ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        ) : (
          <AnnouncementsList
            userId={user.id}
            userRole={profile.role}
            userGrade={profile.grade}
            userSection={profile.section}
            userTeams={userTeams}
            allTeams={allTeams}
            teamGradeRanges={teamGradeRanges}
            showNewForm={showNewForm}
            onNewFormChange={setShowNewForm}
          />
        )}
      </div>
    </ProtectedLayout>
  )
}
