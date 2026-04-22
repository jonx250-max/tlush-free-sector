import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initWebVitals } from './lib/webVitals'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

initWebVitals(import.meta.env.VITE_WEB_VITALS_ENDPOINT)
