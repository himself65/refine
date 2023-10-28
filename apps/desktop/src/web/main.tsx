import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@blocksuite/editor/themes/affine.css'
import { getDefaultStore } from 'jotai/vanilla'
import { themeAtom } from '@refine/core/store'
import './index.css'

declare global {
  interface Window {
    apis: {
      getTheme (): Promise<'light' | 'dark'>
      changeTheme (theme: 'light' | 'dark'): Promise<void>
    }
  }
}

const store = getDefaultStore()
const html = document.documentElement

window.apis.getTheme().then(theme => {
  html.dataset.theme = theme
  store.set(themeAtom, theme)
  store.sub(themeAtom, () => {
    const theme = store.get(themeAtom)
    html.dataset.theme = theme
    window.apis.changeTheme(theme).catch(() => {
      console.error('Failed to change theme')
    })
  })
})

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
