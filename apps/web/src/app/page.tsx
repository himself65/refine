'use client'
import {
  type FC,
  type PropsWithChildren,
  type ReactElement,
  use,
  useEffect,
  useState
} from 'react'

let importAppPromise = Promise.resolve(
  { App: () => null as ReactElement | null })
if (typeof window !== 'undefined') {
  importAppPromise = import('@refine/core/app')
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

export default function Home () {
  const { App } = use(importAppPromise)
  return (
    <main>
      <NoSsr>
        <App/>
      </NoSsr>
    </main>
  )
}
