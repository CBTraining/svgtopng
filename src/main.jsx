import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Auto-recover from stale dynamic module chunk fetches after new deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected, auto-reloading for latest deployment chunks...', event);
  window.location.reload();
});

window.addEventListener('error', (event) => {
  if (
    event.message && 
    (event.message.includes('Failed to fetch dynamically imported module') ||
     event.message.includes('error loading dynamically imported module'))
  ) {
    console.warn('Dynamic import chunk outdated, auto-reloading...', event);
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary name="Root Application">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
