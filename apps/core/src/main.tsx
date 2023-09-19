import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

export const LazyApp = lazy(
  () => import('./App').then(({ App }) => ({ default: App })))

const div = document.getElementById('root')
if (!div) throw new Error('Root element not found')

const root = createRoot(div)
root.render(
  <StrictMode>
    <LazyApp/>
  </StrictMode>
)

// Remove Preload scripts loading
postMessage({ payload: 'removeLoading' }, '*')

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
