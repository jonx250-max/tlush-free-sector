import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import {
  isAuthCallbackRequest, stripAuthCallbackState,
  shouldShowAuthCallbackLoading, getPostAuthRedirectPath,
} from '../lib/authCallback'
import { fadeUp, fadeInView } from '../components/landing/motionPresets'
import { SiteNav } from '../components/landing/SiteNav'
import { HeroSection } from '../components/landing/HeroSection'
import { HowItWorksSection } from '../components/landing/HowItWorksSection'
import { FeaturesSection } from '../components/landing/FeaturesSection'
import { AllChecksSection } from '../components/landing/AllChecksSection'
import { SecuritySection } from '../components/landing/SecuritySection'
import { TrustSection } from '../components/landing/TrustSection'
import { MobileStickyCta } from '../components/landing/MobileStickyCta'
import { SiteFooter } from '../components/landing/SiteFooter'

export function LandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, hasCompletedProfile, isLoading } = useAuth()
  const reduced = !!useReducedMotion()

  const hasUser = Boolean(user)
  const sanitized = stripAuthCallbackState(location.search, location.hash)
  const callbackPending = sanitized.changed || isAuthCallbackRequest(location.search)
  const redirectPath = getPostAuthRedirectPath({ isLoading, isAuthCallbackPending: callbackPending, hasUser, hasCompletedProfile })
  const showLoading = shouldShowAuthCallbackLoading({ isLoading, hasUser, isAuthCallbackPending: callbackPending }) || Boolean(redirectPath)

  useEffect(() => {
    if (redirectPath) navigate(redirectPath, { replace: true })
  }, [navigate, redirectPath])

  useEffect(() => {
    if (isLoading || hasUser || !sanitized.changed) return
    navigate({ pathname: location.pathname, search: sanitized.search, hash: sanitized.hash }, { replace: true })
  }, [sanitized.changed, hasUser, isLoading, location.pathname, navigate, sanitized.hash, sanitized.search])

  if (showLoading) return <AuthLoading />

  const hero = fadeUp(reduced)
  const section = (d = 0) => fadeInView(reduced, d)

  return (
    <div className="min-h-screen bg-[#000a1f]" dir="rtl" style={{ fontFamily: "'Heebo', 'Assistant', sans-serif" }}>
      <SiteNav />
      <HeroSection fadeUpProps={hero} />
      <HowItWorksSection heading={section()} step={section} />
      <FeaturesSection heading={section()} card={section} />
      <AllChecksSection heading={section()} card={section} />
      <SecuritySection heading={section()} card={section} />
      <TrustSection anim={section()} />
      <MobileStickyCta />
      <SiteFooter />
    </div>
  )
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000a1f]" dir="rtl">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-400" />
        <p className="mt-4 text-lg font-medium text-white/80">מתחבר...</p>
      </div>
    </div>
  )
}
