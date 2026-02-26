import { supabase, UserProfile, UserRole } from './supabase'

// --- Types ---

export type ClassroomMemberRole = 'student' | 'teacher' | 'coordinator' | 'principal' | 'admin'
export type FolderType = 'coursework' | 'homework'
export type FileStatus = 'not_done' | 'partial' | 'done' | 'completed'
export type SubmissionType = 'text' | 'link' | 'file'
export type AssessmentTag = 'main' | 'other'

export interface Classroom {
  id: string
  title: string
  description: string | null
  start_date: string | null
  end_date: string | null
  coordinator_id: string | null
  banner_url: string | null
  logo_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ClassroomMember {
  id: string
  classroom_id: string
  user_id: string
  role: ClassroomMemberRole
  created_at: string
  user?: UserProfile
}

export interface ClassroomWithDetails extends Classroom {
  members: ClassroomMember[]
  coordinator?: UserProfile
  creator?: UserProfile
  member_count?: number
}

export interface ClassroomFolder {
  id: string
  classroom_id: string
  type: FolderType
  title: string
  description: string | null
  due_date: string | null
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ClassroomFile {
  id: string
  folder_id: string
  title: string
  description: string | null
  due_date: string | null
  requires_submission: boolean
  submission_type: SubmissionType | null
  requires_check: boolean
  attachment_url: string | null
  attachment_name: string | null
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface FileProgress {
  id: string
  file_id: string
  student_id: string
  status: FileStatus
  updated_at: string
  student?: UserProfile
}

export interface FileSubmission {
  id: string
  file_id: string
  student_id: string
  content: string
  submission_type: SubmissionType
  submitted_at: string
  updated_at: string
  student?: UserProfile
}

export interface ClassroomAssessment {
  id: string
  classroom_id: string
  title: string
  description: string | null
  date: string | null
  tag: AssessmentTag
  created_by: string
  created_at: string
  updated_at: string
}

export interface AssessmentMark {
  id: string
  assessment_id: string
  student_id: string
  marks: number | null
  max_marks: number
  created_at: string
  updated_at: string
  student?: UserProfile
}

export interface DiscussionPost {
  id: string
  classroom_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string
  user?: UserProfile
  replies?: DiscussionPost[]
}

export interface FolderWithFiles extends ClassroomFolder {
  files: ClassroomFile[]
}

export interface FileWithProgress extends ClassroomFile {
  progress: FileProgress[]
  submissions: FileSubmission[]
}

// --- Helpers ---

/** Returns true if the classroom's end_date is in the past (classroom is closed). */
export function isClassroomClosed(classroom: Pick<Classroom, 'end_date'>): boolean {
  if (!classroom.end_date) return false
  const today = new Date().toISOString().split('T')[0]
  return classroom.end_date < today
}

/** Upload a classroom banner or logo image and return the public URL. */
export async function uploadClassroomImage(
  classroomId: string,
  file: File,
  kind: 'banner' | 'logo',
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${classroomId}/${kind}_${Date.now()}_${safeName}`

  const { data, error } = await supabase.storage
    .from('classroom-files')
    .upload(path, file, { upsert: true })

  if (error) {
    console.error(`Failed to upload ${kind}:`, error.message)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('classroom-files')
    .getPublicUrl(data.path)

  // Save URL to classroom row
  const { error: updateErr } = await supabase
    .from('classrooms')
    .update({ [`${kind}_url`]: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', classroomId)

  if (updateErr) {
    console.error(`Failed to update classroom ${kind}_url:`, updateErr.message)
    return null
  }

  return publicUrl
}

// --- Classroom CRUD ---

export async function createClassroom(input: {
  title: string
  description?: string
  start_date?: string
  end_date?: string
  coordinator_id?: string
  creatorRole?: string
}, createdBy: string): Promise<Classroom | null> {
  const id = crypto.randomUUID()

  const { error } = await supabase
    .from('classrooms')
    .insert({
      id,
      title: input.title,
      description: input.description || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      coordinator_id: input.coordinator_id || null,
      created_by: createdBy,
    })

  if (error) {
    console.error('Failed to create classroom:', error.message, error.code)
    return null
  }

  // Add creator as member with their actual role (admin/principal/teacher)
  const creatorRole = (['admin', 'principal', 'teacher', 'coordinator'].includes(input.creatorRole || '')
    ? input.creatorRole
    : 'teacher') as ClassroomMemberRole
  await addClassroomMember(id, createdBy, creatorRole)

  // Add coordinator if specified and different from creator
  if (input.coordinator_id && input.coordinator_id !== createdBy) {
    await addClassroomMember(id, input.coordinator_id, 'coordinator')
  }

  return {
    id,
    title: input.title,
    description: input.description || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    coordinator_id: input.coordinator_id || null,
    banner_url: null,
    logo_url: null,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function updateClassroom(classroomId: string, input: {
  title?: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  coordinator_id?: string | null
}): Promise<boolean> {
  const { error } = await supabase
    .from('classrooms')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', classroomId)

  if (error) {
    console.error('Failed to update classroom:', error.message)
    return false
  }
  return true
}

/**
 * Fetch classrooms for a user.
 * - includeAll: if true, returns all classrooms including closed ones (for admin manager).
 *   If false (default), only returns active classrooms (end_date is null or in the future).
 */
export async function fetchClassroomsForUser(userId: string, userRole: UserRole, includeAll = false): Promise<ClassroomWithDetails[]> {
  const today = new Date().toISOString().split('T')[0]

  // Principals and admins see all classrooms
  if (['principal', 'admin'].includes(userRole)) {
    let query = supabase
      .from('classrooms')
      .select('*')
      .order('created_at', { ascending: false })

    if (!includeAll) {
      // Only active classrooms: no end_date OR end_date >= today
      query = query.or(`end_date.is.null,end_date.gte.${today}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch classrooms:', error.message)
      return []
    }

    // Fetch member counts
    const classroomIds = (data ?? []).map((c: Classroom) => c.id)
    const { data: members } = await supabase
      .from('classroom_members')
      .select('classroom_id, user_id')
      .in('classroom_id', classroomIds.length > 0 ? classroomIds : ['__none__'])

    const countMap: Record<string, number> = {}
    for (const m of members ?? []) {
      countMap[m.classroom_id] = (countMap[m.classroom_id] || 0) + 1
    }

    return (data ?? []).map((c: Classroom) => ({
      ...c,
      members: [],
      member_count: countMap[c.id] || 0,
    }))
  }

  // Others see only classrooms they're members of
  const { data: memberships, error: memErr } = await supabase
    .from('classroom_members')
    .select('classroom_id')
    .eq('user_id', userId)

  if (memErr || !memberships || memberships.length === 0) {
    return []
  }

  const classroomIds = memberships.map((m: { classroom_id: string }) => m.classroom_id)

  let query = supabase
    .from('classrooms')
    .select('*')
    .in('id', classroomIds)
    .order('created_at', { ascending: false })

  if (!includeAll) {
    query = query.or(`end_date.is.null,end_date.gte.${today}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch classrooms:', error.message)
    return []
  }

  // Fetch member counts
  const { data: allMembers } = await supabase
    .from('classroom_members')
    .select('classroom_id, user_id')
    .in('classroom_id', classroomIds)

  const countMap: Record<string, number> = {}
  for (const m of allMembers ?? []) {
    countMap[m.classroom_id] = (countMap[m.classroom_id] || 0) + 1
  }

  return (data ?? []).map((c: Classroom) => ({
    ...c,
    members: [],
    member_count: countMap[c.id] || 0,
  }))
}

export async function fetchClassroomById(classroomId: string): Promise<ClassroomWithDetails | null> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', classroomId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch classroom:', error?.message)
    return null
  }

  // Fetch members with profiles
  const { data: members } = await supabase
    .from('classroom_members')
    .select('*')
    .eq('classroom_id', classroomId)

  const memberUserIds = (members ?? []).map((m: ClassroomMember) => m.user_id)
  let profiles: UserProfile[] = []
  if (memberUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', memberUserIds)
    profiles = (profilesData ?? []) as UserProfile[]
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const enrichedMembers = (members ?? []).map((m: ClassroomMember) => ({
    ...m,
    user: profileMap.get(m.user_id) || undefined,
  }))

  return {
    ...data,
    members: enrichedMembers,
    coordinator: data.coordinator_id ? profileMap.get(data.coordinator_id) : undefined,
    member_count: enrichedMembers.length,
  } as ClassroomWithDetails
}

// --- Members ---

export async function addClassroomMember(classroomId: string, userId: string, role: ClassroomMemberRole): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_members')
    .insert({ classroom_id: classroomId, user_id: userId, role })

  if (error) {
    // Ignore duplicate
    if (error.code === '23505') return true
    console.error('Failed to add classroom member:', error.message)
    return false
  }
  return true
}

export async function addMemberByEmail(classroomId: string, email: string, role: ClassroomMemberRole): Promise<{ success: boolean; error?: string }> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'User not found with that email' }
  }

  const success = await addClassroomMember(classroomId, profile.id, role)
  return { success, error: success ? undefined : 'Failed to add member' }
}

export async function removeClassroomMember(classroomId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_members')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to remove classroom member:', error.message)
    return false
  }
  return true
}

// --- Folders ---

export async function createFolder(input: {
  classroom_id: string
  type: FolderType
  title: string
  description?: string
  due_date?: string
}, createdBy: string): Promise<ClassroomFolder | null> {
  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('classroom_folders')
    .insert({
      id,
      classroom_id: input.classroom_id,
      type: input.type,
      title: input.title,
      description: input.description || null,
      due_date: input.due_date || null,
      created_by: createdBy,
    })

  if (error) {
    console.error('Failed to create folder:', error.message)
    return null
  }

  return {
    id,
    classroom_id: input.classroom_id,
    type: input.type,
    title: input.title,
    description: input.description || null,
    due_date: input.due_date || null,
    sort_order: 0,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function updateFolder(folderId: string, input: {
  title?: string
  description?: string | null
  due_date?: string | null
}): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_folders')
    .update({
      title: input.title,
      description: input.description,
      due_date: input.due_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', folderId)

  if (error) {
    console.error('Failed to update folder:', error.message)
    return false
  }
  return true
}

export async function fetchFolders(classroomId: string, type: FolderType): Promise<ClassroomFolder[]> {
  const { data, error } = await supabase
    .from('classroom_folders')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('type', type)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch folders:', error.message)
    return []
  }

  return (data ?? []) as ClassroomFolder[]
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_folders')
    .delete()
    .eq('id', folderId)
  return !error
}

// --- Files ---

export async function createFile(input: {
  folder_id: string
  title: string
  description?: string
  due_date?: string
  requires_submission?: boolean
  submission_type?: SubmissionType
  requires_check?: boolean
  attachment_url?: string
  attachment_name?: string
}, createdBy: string): Promise<ClassroomFile | null> {
  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('classroom_files')
    .insert({
      id,
      folder_id: input.folder_id,
      title: input.title,
      description: input.description || null,
      due_date: input.due_date || null,
      requires_submission: input.requires_submission || false,
      submission_type: input.requires_submission ? (input.submission_type || 'text') : null,
      requires_check: input.requires_check || false,
      attachment_url: input.attachment_url || null,
      attachment_name: input.attachment_name || null,
      created_by: createdBy,
    })

  if (error) {
    console.error('Failed to create file:', error.message)
    return null
  }

  return {
    id,
    folder_id: input.folder_id,
    title: input.title,
    description: input.description || null,
    due_date: input.due_date || null,
    requires_submission: input.requires_submission || false,
    submission_type: input.requires_submission ? (input.submission_type || 'text') : null,
    requires_check: input.requires_check || false,
    attachment_url: input.attachment_url || null,
    attachment_name: input.attachment_name || null,
    sort_order: 0,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function fetchFilesForFolder(folderId: string): Promise<ClassroomFile[]> {
  const { data, error } = await supabase
    .from('classroom_files')
    .select('*')
    .eq('folder_id', folderId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch files:', error.message)
    return []
  }
  return (data ?? []) as ClassroomFile[]
}

export async function deleteFile(fileId: string): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_files')
    .delete()
    .eq('id', fileId)
  return !error
}

// --- File Progress ---

export async function updateFileProgress(fileId: string, studentId: string, status: FileStatus): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_file_progress')
    .upsert({
      file_id: fileId,
      student_id: studentId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'file_id,student_id' })

  if (error) {
    console.error('Failed to update file progress:', error.message)
    return false
  }
  return true
}

export async function fetchFileProgress(fileId: string): Promise<FileProgress[]> {
  const { data, error } = await supabase
    .from('classroom_file_progress')
    .select('*')
    .eq('file_id', fileId)

  if (error) {
    console.error('Failed to fetch file progress:', error.message)
    return []
  }
  return (data ?? []) as FileProgress[]
}

export async function fetchProgressForStudent(studentId: string, fileIds: string[]): Promise<FileProgress[]> {
  if (fileIds.length === 0) return []
  const { data, error } = await supabase
    .from('classroom_file_progress')
    .select('*')
    .eq('student_id', studentId)
    .in('file_id', fileIds)

  if (error) {
    console.error('Failed to fetch student progress:', error.message)
    return []
  }
  return (data ?? []) as FileProgress[]
}

// --- Submissions ---

export async function submitWork(fileId: string, studentId: string, content: string, submissionType: SubmissionType): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_submissions')
    .upsert({
      file_id: fileId,
      student_id: studentId,
      content,
      submission_type: submissionType,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'file_id,student_id' })

  if (error) {
    console.error('Failed to submit work:', error.message)
    return false
  }
  return true
}

export async function fetchSubmissions(fileId: string): Promise<FileSubmission[]> {
  const { data, error } = await supabase
    .from('classroom_submissions')
    .select('*')
    .eq('file_id', fileId)

  if (error) {
    console.error('Failed to fetch submissions:', error.message)
    return []
  }
  return (data ?? []) as FileSubmission[]
}

export async function fetchStudentSubmission(fileId: string, studentId: string): Promise<FileSubmission | null> {
  const { data, error } = await supabase
    .from('classroom_submissions')
    .select('*')
    .eq('file_id', fileId)
    .eq('student_id', studentId)
    .single()

  if (error) return null
  return data as FileSubmission
}

// --- Assessments ---

export async function createAssessment(input: {
  classroom_id: string
  title: string
  description?: string
  date?: string
  tag: AssessmentTag
}, createdBy: string): Promise<ClassroomAssessment | null> {
  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('classroom_assessments')
    .insert({
      id,
      classroom_id: input.classroom_id,
      title: input.title,
      description: input.description || null,
      date: input.date || null,
      tag: input.tag,
      created_by: createdBy,
    })

  if (error) {
    console.error('Failed to create assessment:', error.message)
    return null
  }

  return {
    id,
    classroom_id: input.classroom_id,
    title: input.title,
    description: input.description || null,
    date: input.date || null,
    tag: input.tag,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function fetchAssessments(classroomId: string): Promise<ClassroomAssessment[]> {
  const { data, error } = await supabase
    .from('classroom_assessments')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Failed to fetch assessments:', error.message)
    return []
  }
  return (data ?? []) as ClassroomAssessment[]
}

export async function deleteAssessment(assessmentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_assessments')
    .delete()
    .eq('id', assessmentId)
  return !error
}

export async function upsertAssessmentMark(assessmentId: string, studentId: string, marks: number | null, maxMarks: number): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_assessment_marks')
    .upsert({
      assessment_id: assessmentId,
      student_id: studentId,
      marks,
      max_marks: maxMarks,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'assessment_id,student_id' })

  if (error) {
    console.error('Failed to upsert mark:', error.message)
    return false
  }
  return true
}

export async function fetchAssessmentMarks(assessmentId: string): Promise<AssessmentMark[]> {
  const { data, error } = await supabase
    .from('classroom_assessment_marks')
    .select('*')
    .eq('assessment_id', assessmentId)

  if (error) {
    console.error('Failed to fetch marks:', error.message)
    return []
  }
  return (data ?? []) as AssessmentMark[]
}

// --- Discussion ---

export async function createDiscussionPost(classroomId: string, userId: string, content: string, parentId?: string): Promise<DiscussionPost | null> {
  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('classroom_discussions')
    .insert({
      id,
      classroom_id: classroomId,
      user_id: userId,
      content,
      parent_id: parentId || null,
    })

  if (error) {
    console.error('Failed to create discussion post:', error.message)
    return null
  }

  return {
    id,
    classroom_id: classroomId,
    user_id: userId,
    content,
    parent_id: parentId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function fetchDiscussionPosts(classroomId: string): Promise<DiscussionPost[]> {
  const { data, error } = await supabase
    .from('classroom_discussions')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch discussions:', error.message)
    return []
  }

  // Fetch user profiles
  const userIds = [...new Set((data ?? []).map((d: DiscussionPost) => d.user_id))]
  let profiles: UserProfile[] = []
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
    profiles = (profilesData ?? []) as UserProfile[]
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const posts = (data ?? []).map((d: DiscussionPost) => ({
    ...d,
    user: profileMap.get(d.user_id),
  })) as DiscussionPost[]

  // Organize into tree: top-level posts with replies
  const topLevel = posts.filter((p) => !p.parent_id)
  const replies = posts.filter((p) => p.parent_id)

  for (const post of topLevel) {
    post.replies = replies.filter((r) => r.parent_id === post.id)
  }

  return topLevel
}

export async function deleteDiscussionPost(postId: string): Promise<boolean> {
  const { error } = await supabase
    .from('classroom_discussions')
    .delete()
    .eq('id', postId)
  return !error
}

// --- Helpers ---

export async function fetchCoordinators(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'coordinator')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Failed to fetch coordinators:', error.message)
    return []
  }
  return (data ?? []) as UserProfile[]
}

/** Returns all users eligible to be set as responsible coordinator (coordinator, principal, admin). */
export async function fetchCoordinatorEligible(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['coordinator', 'principal', 'admin'])
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Failed to fetch coordinator-eligible users:', error.message)
    return []
  }
  return (data ?? []) as UserProfile[]
}

/** Fetches ALL file progress records across the given file IDs (any student). For staff use. */
export async function fetchProgressForFiles(fileIds: string[]): Promise<FileProgress[]> {
  if (fileIds.length === 0) return []
  const { data, error } = await supabase
    .from('classroom_file_progress')
    .select('*')
    .in('file_id', fileIds)

  if (error) {
    console.error('Failed to fetch progress for files:', error.message)
    return []
  }
  return (data ?? []) as FileProgress[]
}

/** Extracts a YouTube embed URL from any YouTube share/watch/embed link. Returns null if not YouTube. */
export function extractYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  return null
}

/** Uploads a document file to Supabase storage and returns its public URL and name.
 *  Requires a 'classroom-files' storage bucket in Supabase with public read access.
 *  Max size: 20 MB. Returns { url, name } on success or { error } on failure. */
export async function uploadClassroomFile(
  classroomId: string,
  file: File,
): Promise<{ url: string; name: string } | { error: string }> {
  const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
  if (file.size > MAX_SIZE) {
    return { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.` }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${classroomId}/${Date.now()}_${safeName}`

  const { data, error } = await supabase.storage
    .from('classroom-files')
    .upload(path, file, { upsert: false })

  if (error) {
    console.error('Failed to upload file:', error.message)
    const msg = error.message.toLowerCase()
    if (msg.includes('bucket') || msg.includes('not found') || msg.includes('does not exist')) {
      return { error: 'Storage bucket "classroom-files" not found. Please create it in Supabase Storage with public read access.' }
    }
    if (msg.includes('policy') || msg.includes('permission') || msg.includes('unauthorized')) {
      return { error: 'Upload permission denied. Check the storage bucket RLS policies.' }
    }
    return { error: `Upload failed: ${error.message}` }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('classroom-files')
    .getPublicUrl(data.path)

  return { url: publicUrl, name: file.name }
}

/** Uploads a student submission file to Supabase storage.
 *  Uses the same 'classroom-files' bucket, under a 'submissions' prefix.
 *  Max size: 20 MB. Returns { url, name } on success or { error } on failure. */
export async function uploadSubmissionFile(
  fileId: string,
  studentId: string,
  file: File,
): Promise<{ url: string; name: string } | { error: string }> {
  const MAX_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.` }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `submissions/${fileId}/${studentId}/${Date.now()}_${safeName}`

  const { data, error } = await supabase.storage
    .from('classroom-files')
    .upload(path, file, { upsert: true })

  if (error) {
    console.error('Failed to upload submission file:', error.message)
    const msg = error.message.toLowerCase()
    if (msg.includes('bucket') || msg.includes('not found') || msg.includes('does not exist')) {
      return { error: 'Storage bucket "classroom-files" not found. Please create it in Supabase Storage.' }
    }
    return { error: `Upload failed: ${error.message}` }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('classroom-files')
    .getPublicUrl(data.path)

  return { url: publicUrl, name: file.name }
}

export async function fetchStudentMembers(classroomId: string): Promise<(ClassroomMember & { user: UserProfile })[]> {
  const { data: members, error } = await supabase
    .from('classroom_members')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('role', 'student')

  if (error || !members || members.length === 0) return []

  const userIds = members.map((m: ClassroomMember) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p: UserProfile) => [p.id, p]))

  return members
    .map((m: ClassroomMember) => ({
      ...m,
      user: profileMap.get(m.user_id),
    }))
    .filter((m: ClassroomMember & { user?: UserProfile }) => m.user) as (ClassroomMember & { user: UserProfile })[]
}

// Fetch all files across all folders for a classroom (for student dashboard calendar)
export async function fetchAllFilesForClassroom(classroomId: string): Promise<(ClassroomFile & { folder: ClassroomFolder })[]> {
  const { data: folders, error: fErr } = await supabase
    .from('classroom_folders')
    .select('*')
    .eq('classroom_id', classroomId)

  if (fErr || !folders || folders.length === 0) return []

  const folderIds = folders.map((f: ClassroomFolder) => f.id)
  const { data: files, error: fileErr } = await supabase
    .from('classroom_files')
    .select('*')
    .in('folder_id', folderIds)
    .order('due_date', { ascending: true })

  if (fileErr) return []

  const folderMap = new Map(folders.map((f: ClassroomFolder) => [f.id, f]))

  return (files ?? []).map((f: ClassroomFile) => ({
    ...f,
    folder: folderMap.get(f.folder_id)!,
  }))
}
