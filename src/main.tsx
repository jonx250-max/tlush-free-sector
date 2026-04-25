import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initWebVitals } from './lib/webVitals'
import { installGlobalHandlers } from './lib/errorTracking'
import '@fontsource/heebo/400.css'
import '@fontsource/heebo/500.css'
import '@fontsource/heebo/600.css'
import '@fontsource/heebo/700.css'
import '@fontsource/heebo/800.css'
import './index.css'
import './styles/a11y.css'

installGlobalHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

initWebVitals(import.meta.env.VITE_WEB_VITALS_ENDPOINT)
