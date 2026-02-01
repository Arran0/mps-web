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
  const isViewingSelf = selectedUserId === currentUserId
  const selectedMember = !isViewingSelf ? members.find(m => m.id === selectedUserId) : null

  return (
    <div className={`glass rounded-xl p-4 border-2 transition-colors ${
      !isViewingSelf ? 'border-mps-blue-300 bg-mps-blue-50/50' : 'border-transparent'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          !isViewingSelf ? 'bg-mps-blue-500' : 'bg-gradient-to-br from-mps-blue-500 to-mps-green-500'
        }`}>
          <Users size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 mb-0.5">
            {!isViewingSelf ? `Viewing task space of` : 'Your Task Space'}
          </p>
          <div className="relative">
            <select
              value={selectedUserId}
              onChange={e => onSelect(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-mps-blue-500/50 cursor-pointer"
            >
              <option value={currentUserId}>My Task Space</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
      {!isViewingSelf && selectedMember && (
        <p className="text-xs text-mps-blue-600 mt-2 ml-13 font-medium">
          You have full access to this member&apos;s tasks
        </p>
      )}
    </div>
  )
}
