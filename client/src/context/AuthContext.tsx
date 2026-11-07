/* oxlint-disable react/only-export-components, react/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { setAuthToken, clearAuthToken, authApi } from '../lib/api'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  displayName: string
  rawUsername: string
}

export interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isProfileLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const activeUserIdRef = useRef<string | null>(null)

  /**
   * Derives initial fallback identity from Supabase Auth metadata or email prefix.
   * This provides instantaneous zero-lag UI rendering while authoritative DB fetch runs.
   */
  const computeInitialUser = useCallback((sbUser: User): AuthUser => {
    const meta = sbUser.user_metadata || {}
    const email = sbUser.email || ''
    const emailPrefix = email ? email.split('@')[0] : ''
    const fullName = (meta.full_name || meta.name || '').trim()
    const displayName = (meta.display_name || fullName || '').trim()
    const rawUsername = fullName || displayName || emailPrefix || 'VAANI USER'

    return {
      id: sbUser.id,
      email,
      fullName,
      displayName: displayName || rawUsername,
      rawUsername,
    }
  }, [])

  /**
   * Queries the Supabase 'profiles' table using the authenticated user's ID and RLS.
   * Falls back to /api/auth/me or auth metadata if the database record is pending.
   */
  const fetchAuthoritativeProfile = useCallback(async (sbUser: User) => {
    const userId = sbUser.id
    activeUserIdRef.current = userId
    setIsProfileLoading(true)

    const userEmail = sbUser.email || ''
    const meta = sbUser.user_metadata || {}
    const emailPrefix = userEmail ? userEmail.split('@')[0] : ''
    const metaName = (meta.full_name || meta.name || meta.display_name || '').trim()

    try {
      // 1. Primary: Direct Supabase profiles table query (protected by RLS auth.uid() = id)
      const { data: profileRow, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, full_name')
        .eq('id', userId)
        .maybeSingle()

      // Guard: Check if user switched accounts while request was in-flight
      if (activeUserIdRef.current !== userId) return

      if (!error && profileRow) {
        const dbFullName = (profileRow.full_name || '').trim()
        const dbDisplayName = (profileRow.display_name || '').trim()
        const resolvedName = dbFullName || dbDisplayName || metaName || emailPrefix || 'VAANI USER'

        setUser({
          id: userId,
          email: profileRow.email || userEmail,
          fullName: dbFullName || metaName,
          displayName: dbDisplayName || resolvedName,
          rawUsername: resolvedName,
        })
        return
      }

      // 2. Secondary fallback: Backend API /api/auth/me
      try {
        const meResponse = await authApi.getMe()
        if (activeUserIdRef.current !== userId) return
        if (meResponse?.user) {
          const apiFullName = (meResponse.user.full_name || '').trim()
          const apiDisplayName = (meResponse.user.display_name || '').trim()
          const resolvedName = apiFullName || apiDisplayName || metaName || emailPrefix || 'VAANI USER'

          setUser({
            id: userId,
            email: meResponse.user.email || userEmail,
            fullName: apiFullName || metaName,
            displayName: apiDisplayName || resolvedName,
            rawUsername: resolvedName,
          })
          return
        }
      } catch {
        // Backend API offline or token unverified; continue to metadata fallback
      }
    } catch (err) {
      console.warn('[VAANI AuthContext] Profile query notice:', err)
    } finally {
      if (activeUserIdRef.current === userId) {
        setIsProfileLoading(false)
      }
    }

    // 3. Metadata & Email prefix fallback
    if (activeUserIdRef.current === userId) {
      const fallbackName = metaName || emailPrefix || 'VAANI USER'
      setUser({
        id: userId,
        email: userEmail,
        fullName: metaName,
        displayName: fallbackName,
        rawUsername: fallbackName,
      })
      setIsProfileLoading(false)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.warn('[VAANI AuthContext] Error getting session:', error.message)
        activeUserIdRef.current = null
        setSession(null)
        setUser(null)
        clearAuthToken()
        return
      }

      if (data.session?.user) {
        setSession(data.session)
        setUser(computeInitialUser(data.session.user))
        setAuthToken(data.session.access_token)
        // Authoritative fetch from Supabase profiles table
        fetchAuthoritativeProfile(data.session.user)
      } else {
        activeUserIdRef.current = null
        setSession(null)
        setUser(null)
        clearAuthToken()
      }
    } catch (err) {
      console.warn('[VAANI AuthContext] Exception getting session:', err)
      activeUserIdRef.current = null
      setSession(null)
      setUser(null)
      clearAuthToken()
    } finally {
      setIsLoading(false)
    }
  }, [computeInitialUser, fetchAuthoritativeProfile])

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await fetchAuthoritativeProfile(session.user)
    }
  }, [session, fetchAuthoritativeProfile])

  useEffect(() => {
    refreshSession()

    // Subscribe to auth state updates (login, logout, token refresh, user update)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[VAANI AuthContext] Auth state change event: ${event}`)
      if (currentSession?.user) {
        setSession(currentSession)
        setUser(computeInitialUser(currentSession.user))
        setAuthToken(currentSession.access_token)
        fetchAuthoritativeProfile(currentSession.user)
      } else {
        activeUserIdRef.current = null
        setSession(null)
        setUser(null)
        setIsProfileLoading(false)
        clearAuthToken()
      }
      setIsLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [computeInitialUser, fetchAuthoritativeProfile, refreshSession])

  const signOut = useCallback(async () => {
    setIsLoading(true)
    activeUserIdRef.current = null
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[VAANI AuthContext] Sign out error:', err)
    } finally {
      clearAuthToken()
      setSession(null)
      setUser(null)
      setIsProfileLoading(false)
      setIsLoading(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isProfileLoading,
      isAuthenticated: Boolean(user && session),
      signOut,
      refreshSession,
      refreshProfile,
    }),
    [user, session, isLoading, isProfileLoading, signOut, refreshSession, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
