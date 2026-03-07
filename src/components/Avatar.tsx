'use client'

import React from 'react'
import Image from 'next/image'

interface AvatarProps {
  avatarUrl?: string | null
  name?: string | null
  email?: string | null
  size?: number          // pixel size (width = height)
  className?: string
}

/** Renders a circular avatar: image if avatarUrl is set, otherwise initials. */
export default function Avatar({ avatarUrl, name, email, size = 36, className = '' }: AvatarProps) {
  const initials =
    name
      ?.split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ||
    email?.charAt(0).toUpperCase() ||
    '?'

  const style = { width: size, height: size, minWidth: size, minHeight: size }

  if (avatarUrl) {
    return (
      <div
        style={style}
        className={`rounded-full overflow-hidden flex-shrink-0 bg-slate-200 ${className}`}
      >
        <Image
          src={avatarUrl}
          alt={name || 'Avatar'}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized
        />
      </div>
    )
  }

  // Gradient fallback with initials
  return (
    <div
      style={style}
      className={`rounded-full flex-shrink-0 bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white font-bold ${className}`}
    >
      <span style={{ fontSize: Math.max(10, size * 0.38) }}>{initials}</span>
    </div>
  )
}
