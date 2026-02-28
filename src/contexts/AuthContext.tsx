'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, UserProfile, UserRole } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Track whether the user was logged in so we can show the "session expired"
  // banner on the login page.  Using a ref avoids stale-closure issues — it
  // always reflects the latest value no matter which async callback reads it.
  const wasLoggedInRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    // Initial session load.
    // IMPORTANT: we await profile before calling setLoading(false) so that
    // ProtectedLayout never briefly renders with user!=null but profile==null
    // (which would produce a blank screen while the profile is still in-flight).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      wasLoggedInRef.current = !!session?.user
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id)
        setProfile(profileData)
      }
      setLoading(false)
    }).catch((err) => {
      console.error('Error getting session:', err)
      setLoading(false)
    })

    // onAuthStateChange is the single source of truth for all subsequent auth
    // events (token refresh, sign-out, sign-in from another tab, etc.).
    // We do NOT call setUser/setProfile in the tab-focus handler below —
    // getSession() there only triggers Supabase's auto-refresh mechanism, and
    // onAuthStateChange fires when anything actually changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || !session) {
          // If the user was previously logged in, flag it for the login page.
          if (wasLoggedInRef.current) {
            sessionStorage.setItem('session_expired', '1')
          }
          wasLoggedInRef.current = false
          setUser(null)
          setProfile(null)
          setSession(null)
        } else {
          // TOKEN_REFRESHED, SIGNED_IN, USER_UPDATED, etc.
          wasLoggedInRef.current = true
          setSession(session)
          setUser(session.user)
          // Fetch profile without clearing the existing one first — this keeps
          // the UI stable (no blank flash) while the fetch is in-flight.
          const profileData = await fetchProfile(session.user.id)
          if (profileData) setProfile(profileData)
        }
      } catch (err) {
        console.error('Error in auth state change:', err)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // When the user returns to this tab (from bfcache or just switching tabs),
  // call getSession() to nudge Supabase into auto-refreshing the access token
  // if it has expired.  We do NOT manually update React state here — that is
  // handled exclusively by onAuthStateChange above, which fires when the token
  // actually changes or when the session is truly gone.  This design eliminates
  // the race condition where both revalidate() and onAuthStateChange fought
  // over the same state simultaneously.
  useEffect(() => {
    const handleTabFocus = () => {
      supabase.auth.getSession().catch(() => {})
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleTabFocus()
    }
    const handlePageShow = (e: PageTransitionEvent) => {
      // e.persisted === true means the page was restored from bfcache
      // (Chrome freezes JS entirely in bfcache; timers including Supabase's
      //  auto-refresh timer never ran, so the access token may have expired).
      if (e.persisted) handleTabFocus()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (error) return { error }

      // Create profile entry
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          role: role,
        })

        if (profileError) {
          console.error('Error creating profile:', profileError)
          return { error: profileError as unknown as Error }
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    wasLoggedInRef.current = false
    // Clear local state immediately for instant UI feedback
    setUser(null)
    setProfile(null)
    setSession(null)
    // Revoke server session in background (don't await)
    supabase.auth.signOut().catch(() => {})
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
