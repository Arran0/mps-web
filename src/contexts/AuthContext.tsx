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

  // Tracks whether the user was actively logged in.
  // Using a ref (not state) avoids stale-closure problems in async callbacks.
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
    // Load the initial session.  We await the profile fetch before clearing
    // the loading flag so ProtectedLayout's spinner covers the full bootstrap
    // period — preventing the brief blank screen where user≠null but profile==null.
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

    // onAuthStateChange handles all future auth events (SIGNED_IN, SIGNED_OUT,
    // TOKEN_REFRESHED, etc.).  The logic here is kept close to the original
    // working version; the only addition is the wasLoggedInRef tracking so we
    // can display an "your session expired" banner on the login page.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        // If the session disappeared while the user was logged in, flag it so
        // the login page can show an "your session has expired" message.
        if (!session && wasLoggedInRef.current) {
          sessionStorage.setItem('session_expired', '1')
        }
        wasLoggedInRef.current = !!session?.user

        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Error in auth state change:', err)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // When the user returns to this tab (after switching tabs or bfcache
  // restoration), nudge Supabase to auto-refresh the access token if needed.
  // We do NOT update React state here — onAuthStateChange fires automatically
  // when something actually changes (TOKEN_REFRESHED, SIGNED_OUT, etc.), so
  // this removes the old race condition where revalidate() and
  // onAuthStateChange fought over the same state simultaneously.
  useEffect(() => {
    const handleTabFocus = () => {
      supabase.auth.getSession().catch(() => {})
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleTabFocus()
    }
    // pageshow with persisted=true fires when Chrome restores a tab from
    // bfcache — JS was frozen, so Supabase's auto-refresh timer never ran.
    const handlePageShow = (e: PageTransitionEvent) => {
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
    // Reset the ref before signing out so onAuthStateChange(SIGNED_OUT) doesn't
    // mistakenly set the "session expired" flag for a voluntary sign-out.
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
