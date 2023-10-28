import type { ReactElement } from 'react'
import {
  type FC,
  type PropsWithChildren,
  use,
  useEffect,
  useState
} from 'react'
import { getDefaultStore } from 'jotai/vanilla'
import { themeAtom } from '@refine/core/store'

const store = getDefaultStore()
store.sub(themeAtom, () => {
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
  const { App } = use(importAppPromise)
  return (
    <NoSsr>
      <App className='w-auto h-96 overflow-scroll border-solid border-2 border-indigo-600'/>
    </NoSsr>
  )
}
