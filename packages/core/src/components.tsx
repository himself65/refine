'use client'
import { type ReactElement } from 'react'
import { use } from 'react'
import { workspaceManager } from './store'
import { BlockSuiteEditor } from './components/editor'
import { useAtomValue } from 'jotai/react'
import { PageList } from './components/page-list'

export type EditorProps = {
  className?: string
  workspaceId: string,
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
    <div
      className={props.className}
    >
      <BlockSuiteEditor mode="page" page={page}/>
    </div>
  )
}

Editor.displayName = 'RefineEditor'

export {
  PageList
}
