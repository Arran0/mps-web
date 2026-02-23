import { supabase, UserProfile } from './supabase'

// --- Types ---

export interface Feedback {
  id: string
  submitted_by: string
  subject: string
  message: string
  file_url: string | null   // storage path inside 'feedback-files' bucket
  file_name: string | null
  file_size: number | null
  reply: string | null
  replied_by: string | null
  replied_at: string | null
  created_at: string
  updated_at: string
}

export interface FeedbackWithDetails extends Feedback {
  submitter?: UserProfile
  replier?: UserProfile
}

export interface NewFeedbackInput {
  subject: string
  message: string
  file?: File
}

const BUCKET = 'feedback-files'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// --- Helpers ---

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
  }
  return null
}

/**
 * Generate a temporary signed URL for a private storage file.
 * Returns null if the path is null or the request fails.
 */
export async function getSignedFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600) // 1 hour expiry

  if (error || !data) return null
  return data.signedUrl
}

// --- CRUD ---

/**
 * Submit a new piece of feedback, optionally uploading a file attachment.
 * File is uploaded to 'feedback-files/{userId}/{uuid}.{ext}'.
 */
export async function submitFeedback(
  input: NewFeedbackInput,
  userId: string
): Promise<{ feedback: Feedback | null; error: string | null }> {
  let file_url: string | null = null
  let file_name: string | null = null
  let file_size: number | null = null

  if (input.file) {
    const validationError = validateFile(input.file)
    if (validationError) return { feedback: null, error: validationError }

    const ext = input.file.name.split('.').pop() || 'bin'
    const path = `${userId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, input.file, { upsert: false })

    if (uploadError) {
      console.error('File upload failed:', uploadError)
      return { feedback: null, error: 'File upload failed. Please try again.' }
    }

    file_url = path
    file_name = input.file.name
    file_size = input.file.size
  }

  const { data, error } = await supabase
    .from('feedbacks')
    .insert({
      submitted_by: userId,
      subject: input.subject.trim(),
      message: input.message.trim(),
      file_url,
      file_name,
      file_size,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to submit feedback:', error)
    return { feedback: null, error: 'Failed to submit feedback. Please try again.' }
  }

  return { feedback: data as Feedback, error: null }
}

/**
 * Fetch feedbacks submitted by the current user.
 */
export async function fetchMyFeedbacks(userId: string): Promise<FeedbackWithDetails[]> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select(
      `*,
      submitter:profiles!feedbacks_submitted_by_fkey(*),
      replier:profiles!feedbacks_replied_by_fkey(*)`
    )
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch own feedbacks:', error)
    return []
  }

  return (data ?? []) as FeedbackWithDetails[]
}

/**
 * Fetch ALL feedbacks. Admin only — RLS enforces this.
 */
export async function fetchAllFeedbacks(): Promise<FeedbackWithDetails[]> {
  const { data, error } = await supabase
    .from('feedbacks')
    .select(
      `*,
      submitter:profiles!feedbacks_submitted_by_fkey(*),
      replier:profiles!feedbacks_replied_by_fkey(*)`
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch all feedbacks:', error)
    return []
  }

  return (data ?? []) as FeedbackWithDetails[]
}

/**
 * Save or update an admin reply on a feedback item.
 */
export async function replyToFeedback(
  feedbackId: string,
  reply: string,
  adminId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('feedbacks')
    .update({
      reply: reply.trim(),
      replied_by: adminId,
      replied_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)

  if (error) {
    console.error('Failed to reply to feedback:', error)
    return false
  }

  return true
}

/**
 * Delete a feedback entry. Admin only — RLS enforces this.
 */
export async function deleteFeedback(feedbackId: string): Promise<boolean> {
  const { error } = await supabase
    .from('feedbacks')
    .delete()
    .eq('id', feedbackId)

  if (error) {
    console.error('Failed to delete feedback:', error)
    return false
  }

  return true
}
