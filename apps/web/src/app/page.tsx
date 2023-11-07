'use client'
import React, {
  type FC,
  type PropsWithChildren,
  useEffect,
  useState,
  type ReactElement,
  Suspense
} from 'react'
import { workspaceManager } from '@refine/core/store'
import { useAtomValue } from 'jotai/react'
import { workspaceIdAtom, pageIdAtom } from '../store'
import dynamic from 'next/dynamic'

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

const NoSsr: FC<PropsWithChildren> = ({
  children
}) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return (
    <>
      {mounted ? children : null}
    </>
  )
}

function HomeImpl () {
  const workspaceId = useAtomValue(workspaceIdAtom)
  const pageId = useAtomValue(pageIdAtom)
  const pageAtom = workspaceManager.getWorkspacePageAtom(workspaceId, pageId)
  const page = useAtomValue(pageAtom)
  useEffect(() => {
    window.page = page
  }, [page])
  return (
    <main>
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
  const workspace = useAtomValue(workspaceManager.getWorkspaceAtom(workspaceId))
  const effectAtom = workspaceManager.getWorkspaceEffectAtom(workspaceId)
  useAtomValue(effectAtom)
  useEffect(() => {
    window.workspace = workspace
  }, [workspace])
  return (
    <Suspense fallback="loading workspace">
      <PageList workspace={workspace}/>
      <NoSsr>
        <HomeImpl/>
      </NoSsr>
    </Suspense>
  )
}
