'use client'
import React, {
  useEffect,
  type ReactElement,
  Suspense
} from 'react'
import { workspaceManager } from '@refine/core/store'
import { useAtomValue } from 'jotai/react'
import { workspaceIdAtom, pageIdAtom } from '../store'
import dynamic from 'next/dynamic'
import { noSSR } from 'foxact/no-ssr'

const Editor = dynamic(() => import('@refine/core/components').then(
  ({ Editor }) => ({ default: Editor })), {
  ssr: false
})

const PageList = dynamic(() => import('@refine/core/components').then(
  ({ PageList }) => ({ default: PageList })), {
  ssr: false
})

declare global {
  interface Window {
    workspace: unknown
    page: unknown
  }
}

function HomeImpl () {
  noSSR()
  const workspaceId = useAtomValue(workspaceIdAtom)
  const workspaceAtom = workspaceManager.getWorkspaceAtom(workspaceId)
  const workspace = useAtomValue(workspaceAtom)
  const pageId = useAtomValue(pageIdAtom)
  const pageAtom = workspaceManager.getWorkspacePageAtom(workspaceId, pageId)
  const page = useAtomValue(pageAtom)
  useEffect(() => {
    window.workspace = workspace
    window.page = page
  }, [workspace, page])
  return (
    <main>
      <PageList workspace={workspace}/>
      <Suspense
        fallback="loading editor"
      >
        <Editor workspaceId={workspaceId} pageId={pageId}/>
      </Suspense>
    </main>
  )
}

export default function Home (): ReactElement {
  const workspaceId = useAtomValue(workspaceIdAtom)
  const effectAtom = workspaceManager.getWorkspaceEffectAtom(workspaceId)
  useAtomValue(effectAtom)
  return (
    <Suspense fallback="loading workspace">
      <HomeImpl/>
    </Suspense>
  )
}
