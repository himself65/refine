'use client'
import { ThemeProvider } from 'next-themes'
import { Provider as JotaiProvider } from 'jotai/react'
import type { FC, PropsWithChildren } from 'react'
import { injectPromise } from '../store'
import { use } from 'react'

const ProviderInner: FC<PropsWithChildren> = ({
  children
}) => {
  use(injectPromise)
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
