import type { ReactElement } from 'react'
import {
  use
} from 'react'
import { useIsClient } from 'foxact/use-is-client'
import { workspaceManager } from '@refine/core/store'
import { getDefaultStore } from 'jotai/vanilla'

let importAppPromise: Promise<typeof import('@refine/core/components')>
let promise: Promise<void>
const store = getDefaultStore()
if (typeof window !== 'undefined') {
  importAppPromise = import('@refine/core/components')
  promise = store.get(workspaceManager.getWorkspaceAtom('workspace:0')).
    then(async workspace => {
      const page = workspace.createPage('page0')
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

export const Preview = (): ReactElement => {
  const isClient = useIsClient()
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
    <Editor
      className="w-auto h-96 overflow-scroll border-solid border-2 border-indigo-600"
      workspaceId="workspace:0"
      pageId="page0"
    />
  )
}
