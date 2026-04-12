import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User, UserProfile } from '../types'
import { appConfig } from './appConfig'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  hasCompletedProfile: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@example.com',
  fullName: 'משתמש לדוגמה',
  avatarUrl: null,
}

const DEMO_PROFILE: UserProfile = {
  id: 'demo-user-001',
  fullName: 'משתמש לדוגמה',
  avatarUrl: null,
  phoneNumber: null,
  personalInfo: {},
  employmentInfo: {},
  createdAt: new Date().toISOString(),
  updatedAt: null,
}

const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'פרטי ההתחברות שגויים. נסה שנית.',
  'Token has expired or is invalid': 'הקוד פג תוקף. בקש קוד חדש.',
  'Too many requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.',
  'Network request failed': 'בעיית תקשורת. בדוק את החיבור לאינטרנט.',
  'provider is not enabled': 'ספק ההתחברות אינו פעיל. פנה למנהל.',
}

export function mapAuthErrorToHebrew(error: unknown): string {
  if (!error) return 'שגיאה לא ידועה'
  const msg = error instanceof Error ? error.message : String(error)
  for (const [key, hebrew] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (msg.includes(key)) return hebrew
  }
  return 'שגיאה כללית. נסה שוב מאוחר יותר.'
}

function mapSupabaseUser(su: SupabaseUser): User {
  return {
    id: su.id,
    email: su.email ?? null,
    fullName: su.user_metadata?.full_name ?? null,
    avatarUrl: su.user_metadata?.avatar_url ?? null,
  }
}

function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false
  const { personalInfo, employmentInfo } = profile
  return !!(
    personalInfo?.gender &&
    personalInfo?.idNumber &&
    employmentInfo?.employerName &&
    employmentInfo?.payModel
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (appConfig.isDemoAuthEnabled) {
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      setIsLoading(false)
      return
    }

    if (!supabase) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user))
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user))
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw new Error(mapAuthErrorToHebrew(error))
  }, [])

  const signOut = useCallback(async () => {
    if (appConfig.isDemoAuthEnabled) {
      setUser(null)
      setProfile(null)
      return
    }
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    signInWithGoogle,
    signOut,
    hasCompletedProfile: isProfileComplete(profile),
    isLoading,
  }), [user, profile, signInWithGoogle, signOut, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
