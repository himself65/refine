import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@blocksuite/editor/themes/affine.css'
import { themeAtom } from '@refine/core/store'
import { inject } from 'jotai-inject'
import './index.css'

declare global {
  interface Window {
    apis: {
      getTheme (): Promise<'light' | 'dark'>
      changeTheme (theme: 'light' | 'dark'): Promise<void>
    }
  }
}

inject(
  themeAtom,
  () => window.apis.getTheme(),
  (theme) => {
    window.apis.changeTheme(theme).catch(console.error)
    document.documentElement.setAttribute('data-theme', theme)
  }
)

export const LazyApp = lazy(
  () => import('@refine/core/app').then(({ App }) => ({ default: App })))

const div = document.getElementById('root')
if (!div) throw new Error('Root element not found')

const root = createRoot(div)
root.render(
  <StrictMode>
    <LazyApp/>
  </StrictMode>
)
