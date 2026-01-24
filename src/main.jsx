import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { shouldUsePerfLite } from './lib/perf.js'

const root = document.documentElement
const perfParam = new URLSearchParams(window.location.search).get('perf')
const forcePerfLite = perfParam === '1' || perfParam === 'lite'

if (forcePerfLite || shouldUsePerfLite()) {
  root.classList.add('perf-lite')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
