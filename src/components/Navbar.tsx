'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole, getRoleDisplayName, getRoleBadgeColor } from '@/lib/supabase'
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
  FileText,
  Award,
  CreditCard,
  Bus,
  Calendar
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

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/home',
    icon: <Home size={20} />,
  },
  {
    label: 'Task Manager',
    href: '/tasks',
    icon: <ClipboardList size={20} />,
    staffOnly: true,
  },
  {
    label: 'Academics',
    href: '/academics',
    icon: <BookOpen size={20} />,
    children: [
      { label: 'Homework', href: '/academics/homework', icon: <FileText size={18} /> },
      { label: 'Coursework', href: '/academics/coursework', icon: <GraduationCap size={18} /> },
      { label: 'Grades', href: '/academics/grades', icon: <Award size={18} /> },
    ],
  },
  {
    label: 'More',
    href: '/more',
    icon: <MoreHorizontal size={20} />,
    children: [
      { label: 'Fee Manager', href: '/more/fees', icon: <CreditCard size={18} /> },
      { label: 'School Bus', href: '/more/bus', icon: <Bus size={18} /> },
      { label: 'Leave Manager', href: '/more/leave', icon: <Calendar size={18} /> },
    ],
  },
]

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const isStaff = profile ? isStaffRole(profile.role) : false

  // Close dropdowns when clicking outside
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

  const filteredNavItems = navItems.filter(item => {
    if (item.staffOnly && !isStaff) return false
    return true
  })

  if (loading) {
    return (
      <nav className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md">
                <Image 
                  src="/logo.png" 
                  alt="MPS Logo" 
                  width={48} 
                  height={48}
                  className="object-contain"
                />
              </div>
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
            {/* Logo Section */}
            <Link href="/home" className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md transition-transform duration-300 group-hover:scale-105">
                <Image 
                  src="/logo.png" 
                  alt="MPS Logo" 
                  width={48} 
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold gradient-text">MPS Web</h1>
                <p className="text-xs text-slate-500">Muthamil Public School</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
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
                      {item.staffOnly && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                          Staff
                        </span>
                      )}
                    </Link>
                  )}

                  {/* Dropdown Menu */}
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

            {/* Profile Section */}
            <div className="flex items-center gap-4">
              {/* Profile Dropdown */}
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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute right-0 top-20 w-72 h-[calc(100vh-5rem)] bg-white shadow-2xl animate-slide-down"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-2">
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
                      {item.staffOnly && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                          Staff
                        </span>
                      )}
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
