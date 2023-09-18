import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

const div = document.getElementById('root')
if (!div) throw new Error('Root element not found')

const root = createRoot(div)
root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
)

// Remove Preload scripts loading
postMessage({ payload: 'removeLoading' }, '*')

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
