import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User, UserProfile } from '../types'
import { appConfig } from './appConfig'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
  enableDemoMode: () => void
  updateProfile: (data: Partial<UserProfile>) => void
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
  const [user, setUser] = useState<User | null>(() =>
    appConfig.isDemoAuthEnabled ? DEMO_USER : null
  )
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    appConfig.isDemoAuthEnabled ? DEMO_PROFILE : null
  )
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(() =>
    !appConfig.isDemoAuthEnabled && !!supabase
  )

  useEffect(() => {
    if (appConfig.isDemoAuthEnabled || !supabase) return

    const loadAdminFlag = async (userId: string) => {
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle()
      setIsAdmin(!!data?.is_admin)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user))
        loadAdminFlag(session.user.id)
      }
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user))
        loadAdminFlag(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/landing`,
        skipBrowserRedirect: true,
      },
    })
    if (error) {
      if (error.message.includes('Unsupported provider') || error.message.includes('provider is not enabled')) {
        throw new Error('Google provider עדיין לא הופעל ב-Supabase Auth עבור הפרויקט הזה.')
      }
      throw new Error(mapAuthErrorToHebrew(error))
    }

    if (!data?.url) {
      throw new Error('Supabase לא החזיר URL תקין להתחברות עם Google.')
    }

    window.location.assign(data.url)
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase לא מוגדר')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(mapAuthErrorToHebrew(error))
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) throw new Error('Supabase לא מוגדר')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw new Error(mapAuthErrorToHebrew(error))
  }, [])

  const resetPasswordForEmail = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase לא מוגדר')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw new Error(mapAuthErrorToHebrew(error))
  }, [])

  const enableDemoMode = useCallback(() => {
    setUser(DEMO_USER)
    setProfile(DEMO_PROFILE)
  }, [])

  const updateProfile = useCallback((data: Partial<UserProfile>) => {
    setProfile(prev => {
      const base: UserProfile = prev ?? {
        id: user?.id ?? '',
        fullName: user?.fullName ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        phoneNumber: null,
        personalInfo: {},
        employmentInfo: {},
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }
      return { ...base, ...data, updatedAt: new Date().toISOString() }
    })
  }, [user])

  const signOut = useCallback(async () => {
    if (appConfig.isDemoAuthEnabled || user?.id === DEMO_USER.id) {
      setUser(null)
      setProfile(null)
      return
    }
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [user])

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    isAdmin,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    resetPasswordForEmail,
    signOut,
    enableDemoMode,
    updateProfile,
    hasCompletedProfile: isProfileComplete(profile),
    isLoading,
  }), [user, profile, isAdmin, signInWithGoogle, signInWithEmail, signUp, resetPasswordForEmail, signOut, enableDemoMode, updateProfile, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
