'use client'
import { type ReactElement } from 'react'
import { use } from 'react'
import { workspaceManager } from './store'
import { BlockSuiteEditor } from './components/editor'
import { useAtomValue } from 'jotai/react'
import { PageList } from './components/page-list'

export type EditorProps = {
  className?: string
  mode?: 'page' | 'edgeless'
  workspaceId: string
  pageId: string
}

export const Editor = (props: EditorProps): ReactElement => {
  const { workspaceId, pageId } = props
  const effectAtom = workspaceManager.getWorkspaceEffectAtom(workspaceId)
  const pageAtom = workspaceManager.getWorkspacePageAtom(workspaceId, pageId)
  useAtomValue(effectAtom)
  const page = useAtomValue(pageAtom)

  if (!page.loaded) {
    use(page.waitForLoaded())
  }

  return (
    <BlockSuiteEditor className={props.className} mode={props.mode || 'page'} page={page}/>
  )
}

Editor.displayName = 'RefineEditor'

export {
  PageList
}
