import { createStore, Provider } from 'jotai'
import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@blocksuite/editor/themes/affine.css'
import './index.css'
import { currentWorkspaceIdAtom } from '@mini-affine/infra'

const rootStore = createStore()

// FIXME: allow user to create workspace
rootStore.set(currentWorkspaceIdAtom, 'workspace:0')

export const LazyApp = lazy(
  () => import('./App').then(({ App }) => ({ default: App })))

const div = document.getElementById('root')
if (!div) throw new Error('Root element not found')

const root = createRoot(div)
root.render(
  <StrictMode>
    <Provider store={rootStore}>
      <LazyApp/>
    </Provider>
  </StrictMode>
)
