import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initWebVitals } from './lib/webVitals'
import { installGlobalHandlers } from './lib/errorTracking'
// Stage G5 — font subset. Dropped 600 + 800 (rare in our type scale).
// Inspect dist/stats.html bundle viz before re-adding any weight.
import '@fontsource/heebo/400.css'
import '@fontsource/heebo/500.css'
import '@fontsource/heebo/700.css'
import './index.css'
import './styles/a11y.css'

installGlobalHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

initWebVitals(import.meta.env.VITE_WEB_VITALS_ENDPOINT)
