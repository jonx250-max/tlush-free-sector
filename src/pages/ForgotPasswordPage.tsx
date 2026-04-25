import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { FileText, CheckCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { he } from '../i18n/he'

const schema = z.object({
  email: z.string().email('דוא"ל לא תקין'),
})

type Form = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    setServerError(null)
    try {
      await resetPasswordForEmail(data.email)
      setSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" dir="rtl">
      <div className="absolute inset-0 bg-[#000a1f]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cs-primary text-white">
              {sent ? <CheckCircle size={32} /> : <FileText size={32} />}
            </div>
            <h1 className="text-2xl font-bold text-white">
              {sent ? he.forgotPassword.sentTitle : he.forgotPassword.title}
            </h1>
            <p className="mt-2 text-center text-sm text-white/50">
              {sent ? he.forgotPassword.sentBody : he.forgotPassword.subtitle}
            </p>
          </div>

          {!sent && (
            <>
              {serverError && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/70">{he.signup.email}</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white focus:border-cs-gold focus:outline-none"
                    autoComplete="email"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-cs-primary px-4 py-3.5 text-sm font-semibold text-white hover:bg-cs-primary-dark disabled:opacity-60"
                >
                  {isSubmitting ? he.common.loading : he.forgotPassword.submit}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center">
            <Link to="/login" className="text-sm text-cs-gold underline">
              {he.forgotPassword.backToLogin}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
