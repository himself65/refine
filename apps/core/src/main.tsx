import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@blocksuite/editor/themes/affine.css'
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
