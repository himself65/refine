import type { ReactElement } from 'react'
import {
  use, useEffect
} from 'react'
import { useTheme } from 'next-themes'
import { useIsClient } from 'foxact/use-is-client'
import { EditorHeader } from '@refine/core/components/editor-header'
import { workspaceManager } from '@refine/core/store'
import { atom, getDefaultStore } from 'jotai/vanilla'

import { useAtom } from 'jotai/react'

let importAppPromise: Promise<typeof import('@refine/core/components')>
let promise: Promise<void>
const store = getDefaultStore()
if (typeof window !== 'undefined') {
  importAppPromise = import('@refine/core/components')
  promise = store.get(workspaceManager.getWorkspaceAtom('workspace:0')).
    then(async workspace => {
      let page = workspace.getPage('page0')
      if (page !== null) {
        await page.waitForLoaded()
        return
      }
      page = workspace.createPage('page0')
      await page.waitForLoaded()
      const pageBlockId = page.addBlock('affine:page', {
        children: [],
        title: new page.Text('Hello, World')
      })
      page.addBlock('affine:surface', {}, pageBlockId)
      const noteBlockId = page.addBlock('affine:note', {}, pageBlockId)
      page.addBlock('affine:paragraph', {}, noteBlockId)
    })
}

const pageModeAtom = atom('page' as 'page' | 'edgeless')

export const Preview = (): ReactElement => {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const html = document.querySelector('html')
    if (!html) {
      return
    }
    if (resolvedTheme === 'dark') {
      html.setAttribute('data-theme', 'dark')
    } else {
      html.removeAttribute('data-theme')
    }
  }, [resolvedTheme])
  const isClient = useIsClient()
  const [pageMode, setPageMode] = useAtom(pageModeAtom)
  if (!isClient) {
    return (
      <div>
        Loading...
      </div>
    )
  }
  const { Editor } = use(importAppPromise)
  use(promise)
  return (
    <>
      <EditorHeader
        value={pageMode}
        onValueChange={setPageMode}
      />
      <Editor
        className="h-96 overflow-scroll border-solid border-2 border-gray-200 dark:border-gray-800"
        workspaceId="workspace:0"
        pageId="page0"
        mode={pageMode}
      />
    </>
  )
}
