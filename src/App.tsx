import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const UploadPage = lazy(() => import('./pages/UploadPage').then(m => ({ default: m.UploadPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const ToolsPage = lazy(() => import('./pages/ToolsPage').then(m => ({ default: m.ToolsPage })))
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then(m => ({ default: m.ResultsPage })))

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
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/landing" replace />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes with Layout */}
              {/* Onboarding (protected, no layout) */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

              {/* Protected routes with Layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/results" element={<ResultsPage result={null} />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/tools" element={<ToolsPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/landing" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
