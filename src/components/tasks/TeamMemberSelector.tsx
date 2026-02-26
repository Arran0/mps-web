'use client'

import React from 'react'
import { UserProfile } from '@/lib/supabase'
import { Eye, ChevronDown } from 'lucide-react'

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
  onSelect,
}: TeamMemberSelectorProps) {
  const isViewingSelf = selectedUserId === currentUserId

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
      isViewingSelf
        ? 'bg-white border-slate-200'
        : 'bg-mps-blue-50 border-mps-blue-200'
    }`}>
      <Eye size={13} className={isViewingSelf ? 'text-slate-400' : 'text-mps-blue-500'} />
      <span className={`text-xs font-medium whitespace-nowrap ${isViewingSelf ? 'text-slate-500' : 'text-mps-blue-600'}`}>
        {isViewingSelf ? 'My space' : 'Viewing:'}
      </span>
      <div className="relative">
        <select
          value={selectedUserId}
          onChange={e => onSelect(e.target.value)}
          className={`appearance-none pr-5 text-xs font-semibold bg-transparent focus:outline-none cursor-pointer ${
            isViewingSelf ? 'text-slate-700' : 'text-mps-blue-700'
          }`}
        >
          <option value={currentUserId}>My Task Space</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
      </div>
    </div>
  )
}
