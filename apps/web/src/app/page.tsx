'use client'
import {
  type FC,
  type PropsWithChildren,
  use,
  useEffect,
  useState
} from 'react'
import { io } from 'socket.io-client'
import { workspaceManager } from '@refine/core/store'
import { useAtomValue } from 'jotai/react'

let importAppPromise: Promise<typeof import('@refine/core/app')>
if (typeof window !== 'undefined') {
  importAppPromise = import('@refine/core/app')
} else {
  importAppPromise = Promise.resolve({
    App: () => <></>
  })
}

const socket = io('http://localhost:3030', {
  query: {
    workspaceId: 'workspace:0',
    userId: '123456'
  }
})

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

let injectPromise = Promise.resolve()
if (typeof window !== 'undefined' && !workspaceManager.localInjected) {
  injectPromise = workspaceManager.injectIndexedDBProvider()
}

if (typeof window !== 'undefined') {
  socket.connect()
}

export default function Home () {
  const { App } = use(importAppPromise)
  use(injectPromise)
  const workspaceId = 'workspace:0'
  const workspaceAtom = workspaceManager.getWorkspaceAtom(workspaceId)
  const effectAtom = workspaceManager.getWorkspaceEffectAtom(workspaceId)
  useAtomValue(workspaceAtom)
  useAtomValue(effectAtom)
  return (
    <main>
      <NoSsr>
        <App className=""/>
      </NoSsr>
    </main>
  )
}
