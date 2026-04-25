import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth, mapAuthErrorToHebrew } from '../lib/auth'
import { he } from '../i18n/he'
import { FileText } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('דוא"ל לא תקין'),
  password: z.string().min(1, 'סיסמה חובה'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, enableDemoMode, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const isDemo = searchParams.get('demo') === 'true'

  // Auto-enable demo mode if ?demo=true
  useEffect(() => {
    if (isDemo && !user && !isLoading) {
      enableDemoMode()
    }
  }, [isDemo, user, isLoading, enableDemoMode])

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, isLoading, navigate])

  if (user && !isLoading) return null

  const handleGoogleSignIn = async () => {
    setError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(mapAuthErrorToHebrew(err))
      setSigningIn(false)
    }
  }

  const handleDemoMode = () => {
    enableDemoMode()
    navigate('/dashboard', { replace: true })
  }

  const onEmailSignIn = async (data: LoginForm) => {
    setError(null)
    try {
      await signInWithEmail(data.email, data.password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0 bg-[#000a1f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right_in_oklab,rgba(147,197,253,0.08),rgba(147,197,253,0)_40%)]" />
        <div className="absolute -top-20 right-[-6rem] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-[-5rem] left-[-4rem] h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0057b8] text-white shadow-lg shadow-blue-500/20">
              <FileText size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Noto Serif Hebrew', serif" }}>
              {he.auth.loginTitle}
            </h1>
            <p className="mt-2 text-center text-sm text-white/50">
              {he.auth.loginSubtitle}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Email + password form */}
          <form onSubmit={handleSubmit(onEmailSignIn)} className="mb-4 space-y-3">
            <div>
              <input
                type="email"
                placeholder={he.signup.email}
                {...register('email')}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-cs-gold focus:outline-none"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <input
                type="password"
                placeholder={he.signup.password}
                {...register('password')}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-cs-gold focus:outline-none"
                autoComplete="current-password"
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-cs-primary px-4 py-3 text-sm font-semibold text-white hover:bg-cs-primary-dark disabled:opacity-60"
            >
              {isSubmitting ? he.common.loading : he.auth.loginTitle}
            </button>
          </form>

          <div className="mb-4 flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="text-cs-gold underline">
              {he.forgotPassword.title}?
            </Link>
            <Link to="/signup" className="text-cs-gold underline">
              {he.signup.title}
            </Link>
          </div>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30">או</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Google sign in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/15 disabled:opacity-60"
          >
            {signingIn ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {signingIn ? he.auth.signingIn : he.auth.signInWithGoogle}
          </button>

          {/* Demo mode */}
          <button
            onClick={handleDemoMode}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3.5 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-400/10"
          >
            {he.common.tryDemo}
          </button>
        </div>

        {/* Legal */}
        <p className="mt-6 text-center text-xs text-white/30">
          בלחיצה על &quot;כניסה&quot; אתה מסכים לתנאי השימוש ולמדיניות הפרטיות
        </p>
      </motion.div>
    </div>
  )
}
