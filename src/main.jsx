import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled by Vite, precached by the PWA for offline use)
import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
