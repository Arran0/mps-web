import { supabase, UserProfile, UserRole } from './supabase'

// ============================================
// Types
// ============================================

export type LeaveType = 'casual' | 'medical'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveApplication {
  id: string
  applicant_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
  status: LeaveStatus
  created_at: string
  updated_at: string
}

export interface LeaveApproval {
  id: string
  leave_application_id: string
  approver_id: string | null
  approver_role: 'coordinator' | 'principal' | 'admin'
  team_id: string | null
  status: LeaveStatus
  comments: string | null
  decided_at: string | null
  created_at: string
  approver?: UserProfile
  team?: { id: string; name: string }
}

export interface LeaveApplicationWithDetails extends LeaveApplication {
  applicant?: UserProfile
  approvals: LeaveApproval[]
}

export interface NewLeaveInput {
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
}

// Leave allowances per year
export const LEAVE_ALLOWANCES: Record<LeaveType, number> = {
  casual: 12,
  medical: 15,
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual Leave (CL)',
  medical: 'Medical Leave',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

// ============================================
// Helper Functions
// ============================================

export async function fetchCoordinators(): Promise<{ id: string; full_name: string; email: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'coordinator')
    .order('full_name')

  if (error) {
    console.error('Failed to fetch coordinators:', error)
    return []
  }
  return (data ?? []) as { id: string; full_name: string; email: string }[]
}

export async function fetchPrincipals(): Promise<{ id: string; full_name: string; email: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'principal')
    .order('full_name')

  if (error) {
    console.error('Failed to fetch principals:', error)
    return []
  }
  return (data ?? []) as { id: string; full_name: string; email: string }[]
}

export async function fetchAdmins(): Promise<{ id: string; full_name: string; email: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'admin')
    .order('full_name')

  if (error) {
    console.error('Failed to fetch admins:', error)
    return []
  }
  return (data ?? []) as { id: string; full_name: string; email: string }[]
}

function calculateLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

// ============================================
// Create Leave Application
// ============================================

export async function createLeaveApplication(
  input: NewLeaveInput,
  applicantId: string,
  applicantRole: UserRole,
  selectedApproverIds: string[] = []
): Promise<LeaveApplication | null> {
  // 1. Create the leave application
  const { data: application, error } = await supabase
    .from('leave_applications')
    .insert({
      applicant_id: applicantId,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason,
      status: 'pending',
    })
    .select()
    .single()

  if (error || !application) {
    console.error('Failed to create leave application:', error)
    return null
  }

  // 2. Create approval records for explicitly selected approvers
  const approvalRecords: {
    leave_application_id: string
    approver_id?: string
    approver_role: string
    team_id?: string
  }[] = []

  if (selectedApproverIds.length > 0) {
    for (const approverId of selectedApproverIds) {
      // Determine approver role based on applicant role
      let approverRole: string
      if (applicantRole === 'teacher') {
        approverRole = 'coordinator'
      } else if (applicantRole === 'coordinator') {
        approverRole = 'principal'
      } else if (applicantRole === 'principal') {
        approverRole = 'admin'
      } else {
        approverRole = 'principal' // fallback
      }

      approvalRecords.push({
        leave_application_id: application.id,
        approver_id: approverId,
        approver_role: approverRole,
      })
    }
  } else {
    // Fallback: auto-assign based on role hierarchy (legacy behavior)
    if (applicantRole === 'teacher') {
      approvalRecords.push({
        leave_application_id: application.id,
        approver_role: 'coordinator',
      })
    } else if (applicantRole === 'coordinator') {
      approvalRecords.push({
        leave_application_id: application.id,
        approver_role: 'principal',
      })
    } else if (applicantRole === 'principal') {
      approvalRecords.push({
        leave_application_id: application.id,
        approver_role: 'admin',
      })
    }
  }

  if (approvalRecords.length > 0) {
    const { error: approvalError } = await supabase
      .from('leave_approvals')
      .insert(approvalRecords)

    if (approvalError) {
      console.error('Failed to create approval records:', approvalError)
      // Rollback the application
      await supabase.from('leave_applications').delete().eq('id', application.id)
      return null
    }
  }

  return application as LeaveApplication
}

// ============================================
// Fetch Leave Applications
// ============================================

export async function fetchMyLeaveApplications(
  userId: string
): Promise<LeaveApplicationWithDetails[]> {
  const { data, error } = await supabase
    .from('leave_applications')
    .select(`
      *,
      applicant:profiles!leave_applications_applicant_id_fkey(*),
      approvals:leave_approvals(*, approver:profiles(*), team:teams(id, name))
    `)
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch leave applications:', error)
    return []
  }

  return (data || []) as LeaveApplicationWithDetails[]
}

export async function fetchPendingApprovalsForUser(
  userId: string,
  userRole: UserRole
): Promise<LeaveApplicationWithDetails[]> {
  // Get approvals where current user is the designated approver
  let query = supabase
    .from('leave_approvals')
    .select('leave_application_id')
    .eq('status', 'pending')

  if (userRole === 'coordinator') {
    // Match by approver_id (explicit selection) or by role with matching team
    query = query
      .eq('approver_role', 'coordinator')
      .eq('approver_id', userId)
  } else if (userRole === 'principal') {
    query = query
      .eq('approver_role', 'principal')
      .eq('approver_id', userId)
  } else if (userRole === 'admin') {
    query = query
      .eq('approver_role', 'admin')
      .eq('approver_id', userId)
  } else {
    return []
  }

  const { data: approvalIds, error: approvalError } = await query

  if (approvalError || !approvalIds || approvalIds.length === 0) {
    return []
  }

  const applicationIds = [...new Set(approvalIds.map(a => a.leave_application_id))]

  const { data: applications, error } = await supabase
    .from('leave_applications')
    .select(`
      *,
      applicant:profiles!leave_applications_applicant_id_fkey(*),
      approvals:leave_approvals(*, approver:profiles(*), team:teams(id, name))
    `)
    .in('id', applicationIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch pending approvals:', error)
    return []
  }

  return (applications || []) as LeaveApplicationWithDetails[]
}

// ============================================
// Approve/Reject Leave
// ============================================

export async function processLeaveApproval(
  approvalId: string,
  approverId: string,
  decision: 'approved' | 'rejected',
  comments?: string
): Promise<boolean> {
  // Update the specific approval
  const { data: approval, error: updateError } = await supabase
    .from('leave_approvals')
    .update({
      approver_id: approverId,
      status: decision,
      comments: comments || null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .select('leave_application_id')
    .single()

  if (updateError || !approval) {
    console.error('Failed to update approval:', updateError)
    return false
  }

  // Check if all approvals for this application are done
  const { data: allApprovals } = await supabase
    .from('leave_approvals')
    .select('status')
    .eq('leave_application_id', approval.leave_application_id)

  if (allApprovals) {
    const allDecided = allApprovals.every(a => a.status !== 'pending')
    const anyRejected = allApprovals.some(a => a.status === 'rejected')
    const allApproved = allApprovals.every(a => a.status === 'approved')

    if (anyRejected) {
      // If any approval is rejected, reject the whole application
      await supabase
        .from('leave_applications')
        .update({ status: 'rejected' })
        .eq('id', approval.leave_application_id)
    } else if (allApproved && allDecided) {
      // If all are approved, approve the application
      await supabase
        .from('leave_applications')
        .update({ status: 'approved' })
        .eq('id', approval.leave_application_id)
    }
  }

  return true
}

// ============================================
// Leave Balance
// ============================================

export async function fetchLeaveBalance(
  userId: string,
  year?: number
): Promise<{ casual: { used: number; total: number }; medical: { used: number; total: number } }> {
  // Academic year: April 1 to March 31
  const now = new Date()
  const currentMonth = now.getMonth() // 0-indexed (0=Jan, 3=Apr)
  const academicYearStart = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1

  const startDate = `${academicYearStart}-04-01`
  const endDate = `${academicYearStart + 1}-03-31`

  const { data: applications } = await supabase
    .from('leave_applications')
    .select('leave_type, start_date, end_date')
    .eq('applicant_id', userId)
    .eq('status', 'approved')
    .gte('start_date', startDate)
    .lte('end_date', endDate)

  let casualUsed = 0
  let medicalUsed = 0

  if (applications) {
    for (const app of applications) {
      const days = calculateLeaveDays(app.start_date, app.end_date)
      if (app.leave_type === 'casual') {
        casualUsed += days
      } else if (app.leave_type === 'medical') {
        medicalUsed += days
      }
    }
  }

  return {
    casual: { used: casualUsed, total: LEAVE_ALLOWANCES.casual },
    medical: { used: medicalUsed, total: LEAVE_ALLOWANCES.medical },
  }
}

// ============================================
// Fetch All Applications (for admin/principal view)
// ============================================

export async function fetchAllLeaveApplications(): Promise<LeaveApplicationWithDetails[]> {
  const { data, error } = await supabase
    .from('leave_applications')
    .select(`
      *,
      applicant:profiles!leave_applications_applicant_id_fkey(*),
      approvals:leave_approvals(*, approver:profiles(*), team:teams(id, name))
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch all leave applications:', error)
    return []
  }

  return (data || []) as LeaveApplicationWithDetails[]
}
