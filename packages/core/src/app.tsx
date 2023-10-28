'use client'
import { type ReactElement, useCallback, useMemo } from 'react'
import { use } from 'react'
import { themeAtom } from './store/api.js'
import { workspaceManager } from './store/index'
import { BlockSuiteEditor } from './components/editor'
import { useAtom, useAtomValue } from 'jotai/react'

export const App = (): ReactElement => {
  const [theme, setTheme] = useAtom(themeAtom)
  const workspaceAtom = workspaceManager.getWorkspaceAtom('workspace:0')
  const effectAtom = workspaceManager.getWorkspaceEffectAtom('workspace:0')
  const workspace = useAtomValue(workspaceAtom)
  useAtomValue(effectAtom)
  const page = useMemo(() => {
    let page = workspace.getPage('page0')
    if (!page) {
      page = workspace.createPage('page0')
      const pageNotNull = page
      pageNotNull.waitForLoaded().then(() => {
        const pageBlockId = pageNotNull.addBlock('affine:page', {
          children: [],
          title: new pageNotNull.Text('Untitled')
        })
        pageNotNull.addBlock('affine:surface', {}, pageBlockId)
        const noteBlockId = pageNotNull.addBlock('affine:note', {}, pageBlockId)
        pageNotNull.addBlock('affine:paragraph', {}, noteBlockId)
      })
    }
    return page
  }, [workspace])

  if (!page.loaded) {
    use(page.waitForLoaded())
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw'
    }}>
      <button
        onClick={
          useCallback(() => {
            setTheme(theme => theme === 'light' ? 'dark' : 'light')
          }, [setTheme])
        }
      >
        change theme. Current theme: {theme}
      </button>
      <BlockSuiteEditor mode="page" page={page}/>
    </div>
  )
}
