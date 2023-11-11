'use client'
import { ThemeProvider } from 'next-themes'
import { Provider as JotaiProvider } from 'jotai/react'
import type { FC, PropsWithChildren } from 'react'
import { injectPromise } from '../store'
import { use, useEffect } from 'react'
import { workspaceManager } from '@refine/core/store'
import { useErrorBoundary } from 'foxact/use-error-boundary'

const ProviderInner: FC<PropsWithChildren> = ({
  children
}) => {
  use(injectPromise)
  const triggerErrorBoundary = useErrorBoundary()
  useEffect(() => {
    const onAbort = () => {
      triggerErrorBoundary(new Error('Upgrade aborted'))
    }
    const signal = workspaceManager.upgradeAbortSignal
    signal.addEventListener('abort', onAbort)
    return () => {
      signal.removeEventListener('abort', onAbort)
    }
  }, [])
  return children
}

export const Provider: FC<PropsWithChildren> = function Providers ({ children }) {
  return (
    <JotaiProvider>
      <ThemeProvider storageKey="next-theme">
        <ProviderInner>
          {children}
        </ProviderInner>
      </ThemeProvider>
    </JotaiProvider>
  )
}
