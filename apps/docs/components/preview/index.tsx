import type { ReactElement } from 'react'
import {
  use, useEffect
} from 'react'
import { useTheme } from 'next-themes'
import { useIsClient } from 'foxact/use-is-client'
import { workspaceManager } from '@refine/core/store'
import { atom, getDefaultStore } from 'jotai/vanilla'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  LayersIcon,
  RowsIcon
} from '@radix-ui/react-icons'

import { useAtomValue, useSetAtom } from 'jotai/react'

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

const pageModeAtom = atom<'page' | 'edgeless'>('page')
const toggleGroupItemClasses =
  'hover:bg-violet3 dark:hover:bg-violet9 color-mauve11 dark:color-mauve1 data-[state=on]:bg-violet6 dark:data-[state=on]:bg-violet9 data-[state=on]:text-violet12 dark:data-[state=on]:text-white flex h-[35px] w-[35px] items-center justify-center bg-white dark:bg-gray-800 text-base leading-4 first:rounded-l last:rounded-r focus:z-10 focus:shadow-[0_0_0_2px] focus:shadow-black dark:focus:shadow-white focus:outline-none'

const ModeSwitch = () => {
  const setPageMode = useSetAtom(pageModeAtom)
  return (
    <ToggleGroup.Root
      className="inline-flex bg-mauve6 rounded space-x-px"
      type="single"
      defaultValue="center"
      aria-label="Text alignment"
      onValueChange={value => setPageMode(value as 'page' | 'edgeless')}
    >
      <ToggleGroup.Item className={toggleGroupItemClasses} value="page"
                        aria-label="Left aligned">
        <RowsIcon/>
      </ToggleGroup.Item>
      <ToggleGroup.Item className={toggleGroupItemClasses} value="edgeless"
                        aria-label="Center aligned">
        <LayersIcon/>
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  )
}

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
  const pageMode = useAtomValue(pageModeAtom)
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
      <ModeSwitch/>
      <Editor
        className="h-96 overflow-scroll border-solid border-2 border-gray-200 dark:border-gray-800"
        workspaceId="workspace:0"
        pageId="page0"
        mode={pageMode}
      />
    </>
  )
}
