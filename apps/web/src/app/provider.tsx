'use client'
import { ThemeProvider, useTheme } from 'next-themes'
import type { FC, PropsWithChildren } from 'react'
import { themeAtom } from '@refine/core/store'
import { useInject } from 'jotai-inject'

const ThemeProviderInner: FC<PropsWithChildren> = ({
  children
}) => {
  const { setTheme: setUpstreamTheme, theme: upstreamTheme } = useTheme()
  useInject(themeAtom, upstreamTheme === 'dark' ? 'dark' : 'light', setUpstreamTheme)
  return children
}

export const Provider: FC<PropsWithChildren> = function Providers ({ children }) {
  return (
    <ThemeProvider storageKey="next-theme">
      <ThemeProviderInner>
        {children}
      </ThemeProviderInner>
    </ThemeProvider>
  )
}
