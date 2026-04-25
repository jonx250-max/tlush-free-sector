import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'

const signupSchema = z.object({
  fullName: z.string().min(2, 'שם מלא חובה'),
  email: z.string().email('דוא"ל לא תקין'),
  password: z.string().min(8, 'לפחות 8 תווים').regex(/[A-Za-z]/, 'אות אחת לפחות').regex(/[0-9]/, 'מספר אחד לפחות'),
  agree: z.literal(true, { errorMap: () => ({ message: 'יש לאשר את התנאים' }) }),
})

type SignupForm = z.infer<typeof signupSchema>

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setServerError(null)
    try {
      await signUp(data.email, data.password, data.fullName)
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" dir="rtl">
      <div className="absolute inset-0 bg-[#000a1f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right_in_oklab,rgba(147,197,253,0.08),rgba(147,197,253,0)_40%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cs-primary text-white shadow-lg shadow-blue-500/20">
              <FileText size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">{he.signup.title}</h1>
            <p className="mt-2 text-center text-sm text-white/50">{he.signup.subtitle}</p>
          </div>

          {serverError && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label={he.signup.fullName} error={errors.fullName?.message}>
              <input type="text" {...register('fullName')} className={inputClass} autoComplete="name" />
            </FormField>

            <FormField label={he.signup.email} error={errors.email?.message}>
              <input type="email" {...register('email')} className={inputClass} autoComplete="email" />
            </FormField>

            <FormField label={he.signup.password} error={errors.password?.message} hint={he.signup.passwordHint}>
              <input type="password" {...register('password')} className={inputClass} autoComplete="new-password" />
            </FormField>

            <label className="flex items-start gap-3 text-sm text-white/70">
              <input type="checkbox" {...register('agree')} className="mt-1 h-4 w-4" />
              <span>
                {he.signup.agreeToTerms} —{' '}
                <Link to="/legal" className="text-cs-gold underline">
                  {he.legal.tabTerms}
                </Link>
              </span>
            </label>
            {errors.agree && <p className="text-xs text-red-400">{errors.agree.message}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-cs-primary px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-cs-primary-dark disabled:opacity-60"
            >
              {isSubmitting ? he.common.loading : he.signup.submit}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            {he.signup.haveAccount}{' '}
            <Link to="/login" className="text-cs-gold underline">
              {he.signup.loginLink}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const inputClass = 'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-cs-gold focus:outline-none focus:ring-2 focus:ring-cs-gold/30'

function FormField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/70">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-white/40">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
