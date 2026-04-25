import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

const UploadPage = lazy(() => import('./pages/UploadPage').then(m => ({ default: m.UploadPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const ToolsPage = lazy(() => import('./pages/ToolsPage').then(m => ({ default: m.ToolsPage })))
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then(m => ({ default: m.ResultsPage })))

/**
 * Static HTML pages served via vercel.json rewrites (P6: 1:1 design
 * fidelity). For local dev (Vite doesn't honor vercel.json rewrites),
 * these fallbacks redirect immediately to the static asset paths.
 *
 * Pages: /, /landing, /login, /signup, /forgot-password, /dashboard,
 *        /tax-profile, /calculator, /rights, /legal, /admin, /audit, /404
 */
function makeStaticFallback(path: string) {
  return function StaticFallback() {
    if (typeof window !== 'undefined') {
      window.location.replace(path)
    }
    return null
  }
}

const LandingFallback = makeStaticFallback('/marketing/index.html')
const LoginFallback = makeStaticFallback('/marketing/Login.html')
const SignupFallback = makeStaticFallback('/marketing/Signup.html')
const ForgotPasswordFallback = makeStaticFallback('/marketing/ForgotPassword.html')
const DashboardFallback = makeStaticFallback('/marketing/Dashboard.html')
const TaxProfileFallback = makeStaticFallback('/marketing/TaxProfile.html')
const CalculatorFallback = makeStaticFallback('/marketing/NetCalculator.html')
const RightsFallback = makeStaticFallback('/marketing/Rights.html')
const LegalFallback = makeStaticFallback('/marketing/Legal.html')
const AdminFallback = makeStaticFallback('/marketing/Admin.html')
const AuditFallback = makeStaticFallback('/marketing/Audit.html')
const NotFoundFallback = makeStaticFallback('/marketing/404.html')

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cs-bg">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-cs-primary border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Static HTML pages — served by vercel.json rewrites; these
                  React routes are local-dev fallbacks that redirect */}
              <Route path="/" element={<LandingFallback />} />
              <Route path="/landing" element={<LandingFallback />} />
              <Route path="/login" element={<LoginFallback />} />
              <Route path="/signup" element={<SignupFallback />} />
              <Route path="/forgot-password" element={<ForgotPasswordFallback />} />
              <Route path="/dashboard" element={<DashboardFallback />} />
              <Route path="/tax-profile" element={<TaxProfileFallback />} />
              <Route path="/calculator" element={<CalculatorFallback />} />
              <Route path="/rights" element={<RightsFallback />} />
              <Route path="/legal" element={<LegalFallback />} />
              <Route path="/admin" element={<AdminFallback />} />
              <Route path="/audit" element={<AuditFallback />} />
              <Route path="/404" element={<NotFoundFallback />} />

              {/* Onboarding (protected, no layout) */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

              {/* React app routes (auth-required, with shared Layout) */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/tools" element={<ToolsPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
