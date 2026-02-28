'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole, isAdminRole, getRoleDisplayName, getRoleBadgeColor } from '@/lib/supabase'
import MPSLogo from './MPSLogo'
import {
  Home,
  ClipboardList,
  BookOpen,
  MoreHorizontal,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  GraduationCap,
  Award,
  CreditCard,
  Calendar,
  Megaphone,
  CalendarDays,
  Users,
  UserPlus,
  MessageSquare,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  staffOnly?: boolean
  children?: {
    label: string
    href: string
    icon: React.ReactNode
  }[]
}

const getNavItems = (isStaff: boolean, isAdmin: boolean): NavItem[] => {
  const items: NavItem[] = [
    {
      label: 'Home',
      href: '/home',
      icon: <Home size={20} />,
    },
    {
      label: 'Announcements',
      href: '/announcements',
      icon: <Megaphone size={20} />,
    },
  ]

  if (isStaff) {
    items.push({
      label: 'Task Manager',
      href: '/tasks',
      icon: <ClipboardList size={20} />,
    })
  }

  items.push({
    label: 'Academics',
    href: '/academics',
    icon: <GraduationCap size={20} />,
  })

  const moreChildren: { label: string; href: string; icon: React.ReactNode }[] = [
    { label: 'Student Leave', href: '/more/leave', icon: <Calendar size={18} /> },
    { label: 'Fee Manager', href: '/more/fees', icon: <CreditCard size={18} /> },
    { label: 'Feedback', href: '/more/feedback', icon: <MessageSquare size={18} /> },
  ]

  if (isStaff) {
    moreChildren.push({ label: 'Staff Leave', href: '/more/staff-leave', icon: <CalendarDays size={18} /> })
  }

  if (isAdmin) {
    moreChildren.push(
      { label: 'Classroom Management', href: '/more/classrooms', icon: <BookOpen size={18} /> },
      { label: 'Teacher Teams', href: '/more/teacher-teams', icon: <Users size={18} /> },
      { label: 'Profiles', href: '/more/profiles', icon: <UserPlus size={18} /> },
    )
  }

  items.push({
    label: 'More',
    href: '/more',
    icon: <MoreHorizontal size={20} />,
    children: moreChildren,
  })

  return items
}

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const isStaff = profile ? isStaffRole(profile.role) : false
  const isAdmin = profile ? isAdminRole(profile.role) : false

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (href: string) => {
    if (href === '/home') return pathname === '/home' || pathname === '/'
    return pathname.startsWith(href)
  }

  const filteredNavItems = getNavItems(isStaff, isAdmin)

  if (loading) {
    return (
      <nav className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <MPSLogo size="md" className="transition-transform duration-300 hover:scale-105" />
              <div>
                <h1 className="font-display text-xl font-bold gradient-text">MPS Web</h1>
                <p className="text-xs text-slate-500">Muthamil Public School</p>
              </div>
            </div>
            <div className="spinner"></div>
          </div>
        </div>
      </nav>
    )
  }

  if (!user) return null

  return (
    <>
      <nav className="glass-strong sticky top-0 z-50 border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/home" className="flex items-center gap-4 group">
              <MPSLogo size="md" className="transition-transform duration-300 group-hover:scale-105" />
              <div>
                <h1 className="font-display text-xl font-bold gradient-text">MPS Web</h1>
                <p className="text-xs text-slate-500">Muthamil Public School</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1" ref={dropdownRef}>
              {filteredNavItems.map((item) => (
                <div key={item.label} className="relative">
                  {item.children ? (
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                      className={`nav-link flex items-center gap-2 ${
                        isActive(item.href) ? 'active' : ''
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${
                          activeDropdown === item.label ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`nav-link flex items-center gap-2 ${
                        isActive(item.href) ? 'active' : ''
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  )}

                  {item.children && (
                    <div
                      className={`dropdown-menu ${activeDropdown === item.label ? 'open' : ''}`}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="dropdown-item"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {child.icon}
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mps-blue-400 to-mps-green-400 flex items-center justify-center text-white font-medium shadow-md">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                      profile ? getRoleBadgeColor(profile.role) : 'bg-slate-100 text-slate-600'
                    }`}>
                      {profile ? getRoleDisplayName(profile.role) : 'Loading...'}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${
                      profileDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className={`dropdown-menu w-64 ${profileDropdownOpen ? 'open' : ''}`}>
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-700">{profile?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="dropdown-item"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <User size={18} />
                    <span>My Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      signOut()
                    }}
                    className="dropdown-item w-full text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setMobileMenuOpen(prev => !prev); setActiveDropdown(null) }}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => { setMobileMenuOpen(false); setActiveDropdown(null) }}>
          <div
            className="absolute right-0 top-20 w-72 h-[calc(100vh-5rem)] bg-white shadow-2xl animate-slide-down"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-2 overflow-y-auto h-full">
              {filteredNavItems.map((item) => (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 transition-transform duration-200 ${
                            activeDropdown === item.label ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {activeDropdown === item.label && (
                        <div className="ml-8 mt-1 space-y-1 animate-slide-down">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {child.icon}
                              <span>{child.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        isActive(item.href)
                          ? 'bg-mps-blue-50 text-mps-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
