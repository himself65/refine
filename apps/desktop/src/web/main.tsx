import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@blocksuite/editor/themes/affine.css'
import './index.css'
import { workspaceManager } from '@refine/core/store'
import { getDefaultStore } from 'jotai/vanilla'
import { Page, Workspace } from '@blocksuite/store'

declare global {
  interface Window {
    playground: boolean
    apis: {
      getTheme (): Promise<'light' | 'dark'>
      changeTheme (theme: 'light' | 'dark'): Promise<void>
    }
    store: ReturnType<typeof getDefaultStore>
    workspace: Workspace
    workspaceManager: typeof workspaceManager
    page: Page
  }
}

window.workspaceManager = workspaceManager
window.store = getDefaultStore()
const store = window.store

if (window.playground === false) {
  const workspaceAtom = workspaceManager.getWorkspaceAtom('workspace:0')

  const promise = workspaceManager.withLocalProvider().
    then(workspaceManager.inject).
    then(
      () => store.get(workspaceAtom).then(async workspace => {
        window.workspace = workspace
        const page = workspace.getPage('page0')
        if (!page) {
          const page = workspace.createPage({
            id: 'page0'
          })
          window.page = page
          await page.waitForLoaded()
          const pageBlockId = page.addBlock('affine:page', {
            children: [],
            title: new page.Text('Untitled')
          })
          page.addBlock('affine:surface', {}, pageBlockId)
          const noteBlockId = page.addBlock('affine:note', {}, pageBlockId)
          page.addBlock('affine:paragraph', {}, noteBlockId)
        } else {
          window.page = page
          await page.waitForLoaded()
        }
      })
    )

  const Editor = lazy(
    () => import('@refine/core/components').then(
      ({ Editor }) => ({ default: Editor })))

  const div = document.getElementById('root')
  if (!div) throw new Error('Root element not found')

  const root = createRoot(div)
  promise.then(() => {
    root.render(
      <StrictMode>
        <Editor
          workspaceId="workspace:0"
          pageId="page0"
        />
      </StrictMode>
    )
  })
}
