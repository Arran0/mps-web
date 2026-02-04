'use client'

import React, { useState, useEffect, useCallback } from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import { useAuth } from '@/contexts/AuthContext'
import { Megaphone } from 'lucide-react'
import AnnouncementsList from '@/components/announcements/AnnouncementsList'
import { fetchTeamsForUser, fetchAllTeams } from '@/lib/announcements'

export default function AnnouncementsPage() {
  const { user, profile } = useAuth()
  const [userTeams, setUserTeams] = useState<{ id: string; name: string }[]>([])
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([])
  const [teamsLoaded, setTeamsLoaded] = useState(false)

  const loadTeams = useCallback(async () => {
    if (!user || !profile) return

    const promises: Promise<void>[] = []

    // Load user's own teams (for coordinators)
    if (['coordinator', 'teacher'].includes(profile.role)) {
      promises.push(
        fetchTeamsForUser(user.id).then(teams => setUserTeams(teams))
      )
    }

    // Load all teams (for principals/admins)
    if (['principal', 'admin'].includes(profile.role)) {
      promises.push(
        fetchAllTeams().then(teams => setAllTeams(teams))
      )
    }

    await Promise.all(promises)
    setTeamsLoaded(true)
  }, [user, profile])

  useEffect(() => { loadTeams() }, [loadTeams])

  if (!user || !profile) return null

  return (
    <ProtectedLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-mps-blue-400 to-purple-500 rounded-xl shadow-lg">
              <Megaphone className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Announcements</h1>
              <p className="text-slate-500 text-sm">Stay updated with the latest news</p>
            </div>
          </div>
        </div>

        {!teamsLoaded && profile.role !== 'student' ? (
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
          />
        )}
      </div>
    </ProtectedLayout>
  )
}
