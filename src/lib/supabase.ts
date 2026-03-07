import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type UserRole = 'student' | 'teacher' | 'coordinator' | 'principal' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  grade?: number
  section?: string
  created_at: string
  updated_at: string
}

export const isStaffRole = (role: UserRole): boolean => {
  return ['teacher', 'coordinator', 'principal', 'admin'].includes(role)
}

export const isAdminRole = (role: UserRole): boolean => {
  return role === 'admin'
}

// Check if user has coordinator tag
export const isCoordinatorRole = (role: UserRole): boolean => {
  return role === 'coordinator'
}

// Check if user has principal tag
export const isPrincipalRole = (role: UserRole): boolean => {
  return role === 'principal'
}

// Check if user can see Team Analytics (all staff roles)
export const canViewTeamAnalytics = (role: UserRole): boolean => {
  return ['admin', 'coordinator', 'principal', 'teacher'].includes(role)
}

export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    student: 'Student',
    teacher: 'Teacher',
    coordinator: 'Coordinator',
    principal: 'Principal',
    admin: 'Administrator',
  }
  return roleNames[role] || role
}

export const getRoleBadgeColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    student: 'bg-mps-blue-100 text-mps-blue-700',
    teacher: 'bg-mps-green-100 text-mps-green-700',
    coordinator: 'bg-amber-100 text-amber-700',
    principal: 'bg-purple-100 text-purple-700',
    admin: 'bg-rose-100 text-rose-700',
  }
  return colors[role] || 'bg-gray-100 text-gray-700'
}
