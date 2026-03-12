'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, Reply, Trash2 } from 'lucide-react'
import { DiscussionPost, createDiscussionPost, fetchDiscussionPosts, deleteDiscussionPost } from '@/lib/classrooms'
import { UserRole } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'

interface DiscussionTabProps {
  classroomId: string
  userId: string
  userRole: UserRole
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function DiscussionTab({ classroomId, userId, userRole }: DiscussionTabProps) {
  const { profile: currentUserProfile } = useAuth()
  const [posts, setPosts] = useState<DiscussionPost[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [posting, setPosting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const canDelete = ['coordinator', 'principal', 'admin'].includes(userRole)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const data = await fetchDiscussionPosts(classroomId)
    setPosts(data)
    setLoading(false)
  }, [classroomId])

  useEffect(() => { loadPosts() }, [loadPosts])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim()) return

    setPosting(true)
    const result = await createDiscussionPost(classroomId, userId, newPostContent.trim())
    if (result) {
      setNewPostContent('')
      await loadPosts()
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    setPosting(false)
  }

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return

    setPosting(true)
    const result = await createDiscussionPost(classroomId, userId, replyContent.trim(), parentId)
    if (result) {
      setReplyContent('')
      setReplyTo(null)
      await loadPosts()
    }
    setPosting(false)
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    const success = await deleteDiscussionPost(postId)
    if (success) {
      await loadPosts()
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading discussion...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Posts */}
      {posts.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <MessageSquare size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No discussions yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="glass rounded-2xl p-4">
              {/* Post */}
              <div className="flex items-start gap-3">
                <Avatar avatarUrl={post.user?.avatar_url} name={post.user?.full_name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{post.user?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-slate-400">{timeAgo(post.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                      className="text-xs text-slate-400 hover:text-mps-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <Reply size={12} /> Reply
                    </button>
                    {(post.user_id === userId || canDelete) && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-xs text-slate-300 hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {post.replies && post.replies.length > 0 && (
                <div className="ml-12 mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
                  {post.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <Avatar avatarUrl={reply.user?.avatar_url} name={reply.user?.full_name} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{reply.user?.full_name || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{timeAgo(reply.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                        {(reply.user_id === userId || canDelete) && (
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="text-xs text-slate-300 hover:text-red-500 flex items-center gap-1 mt-1 transition-colors"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              <AnimatePresence>
                {replyTo === post.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-12 mt-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(post.id) } }}
                      />
                      <button
                        onClick={() => handleReply(post.id)}
                        disabled={!replyContent.trim() || posting}
                        className="p-2 text-mps-blue-600 hover:bg-mps-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* New Post Form */}
      <div className="glass rounded-2xl p-4">
        <form onSubmit={handlePost} className="flex items-start gap-3">
          <Avatar avatarUrl={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name} size={36} />
          <div className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Start a discussion..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!newPostContent.trim() || posting}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={14} /> {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div ref={bottomRef} />
    </div>
  )
}
