import type { ReactElement } from 'react'
import {
  type FC,
  type PropsWithChildren,
  use,
  useEffect,
  useState
} from 'react'
import { themeAtom } from '@refine/core/store'
import { inject } from 'jotai-inject'

inject(themeAtom, () => 'light' as const, () => {
  alert('Change theme is not supported in preview mode')
})

let importAppPromise: Promise<typeof import('@refine/core/app')>
if (typeof window !== 'undefined') {
  importAppPromise = import('@refine/core/app')
} else {
  importAppPromise = Promise.resolve({
    App: () => <></>
  })
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

export const Preview = (): ReactElement => {
  const { Editor } = use(importAppPromise)
  return (
    <NoSsr>
      <App
        className="w-auto h-96 overflow-scroll border-solid border-2 border-indigo-600"/>
    </NoSsr>
  )
}
