'use client'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { use } from 'react'
import { themeAtom } from './store/api.js'
import { workspaceManager } from './store/index'
import { BlockSuiteEditor } from './components/editor'
import { useAtom, useAtomValue } from 'jotai/react'

export type AppProps = {
  className?: string
}

export const App = (props: AppProps): ReactElement => {
  const [theme, setTheme] = useAtom(themeAtom)
  const workspaceAtom = workspaceManager.getWorkspaceAtom('workspace:0')
  const effectAtom = workspaceManager.getWorkspaceEffectAtom('workspace:0')
  const workspace = useAtomValue(workspaceAtom)
  useAtomValue(effectAtom)
  const [page, setPage] = useState(workspace.getPage('page0'))
  useEffect(() => {
    const dispose = workspace.slots.pageAdded.on((pageId) => {
      if (pageId === 'page0') {
        setPage(workspace.getPage('page0'))
      }
    })
    return () => {
      dispose.dispose()
    }
  }, [])

  const handleNewPage = async () => {
    const page = workspace.createPage({ id: 'page0' })
    workspace.setPageMeta('page0', {
      tags: []
    })
    await page.waitForLoaded()
    const pageBlockId = page.addBlock('affine:page', {
      children: [],
      title: new page.Text('Untitled')
    })
    page.addBlock('affine:surface', {}, pageBlockId)
    const noteBlockId = page.addBlock('affine:note', {}, pageBlockId)
    page.addBlock('affine:paragraph', {}, noteBlockId)
    setPage(page)
  }

  const handleChangeTheme = useCallback(() => {
    setTheme(theme => theme === 'light' ? 'dark' : 'light')
  }, [setTheme])

  if (!page) {
    return (
      <div>
        Page not found
        <button
          onClick={handleNewPage}
        >create page</button>
      </div>
    )
  }

  if (!page.loaded) {
    use(page.waitForLoaded())
  }

  return (
    <div
      className={props.className}
    >
      <button
        onClick={handleChangeTheme}
      >
        change theme. Current theme: {theme}
      </button>
      <BlockSuiteEditor mode="page" page={page}/>
    </div>
  )
}
