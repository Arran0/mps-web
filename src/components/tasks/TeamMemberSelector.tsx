'use client'

import React from 'react'
import { UserProfile } from '@/lib/supabase'
import { Users, ChevronDown } from 'lucide-react'

interface TeamMemberSelectorProps {
  members: UserProfile[]
  selectedUserId: string
  currentUserId: string
  currentUserName: string
  onSelect: (userId: string) => void
}

export default function TeamMemberSelector({
  members,
  selectedUserId,
  currentUserId,
  currentUserName,
  onSelect,
}: TeamMemberSelectorProps) {
  const selectedUser = selectedUserId === currentUserId
    ? { full_name: currentUserName, role: 'self' }
    : members.find(m => m.id === selectedUserId)

  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Users size={14} className="text-mps-blue-600" />
        <span className="text-xs font-medium text-slate-500">Viewing Task Space</span>
      </div>
      <div className="relative">
        <select
          value={selectedUserId}
          onChange={e => onSelect(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 cursor-pointer"
        >
          <option value={currentUserId}>My Task Space ({currentUserName})</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>
              {m.full_name} ({m.role})
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}
