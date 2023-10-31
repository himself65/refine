'use client'
import { ThemeProvider, useTheme } from 'next-themes'
import type { FC, PropsWithChildren } from 'react'
import { themeAtom } from '@refine/core/store'
import { useInject } from 'jotai-inject'
import { useRef } from 'react'

const ThemeProviderInner: FC<PropsWithChildren> = ({
  children
}) => {
  const { setTheme: setUpstreamTheme, theme: upstreamTheme } = useTheme()
  const themeRef = useRef<'light' | 'dark'>(
    upstreamTheme === 'dark' ? 'dark' : 'light')
  themeRef.current = upstreamTheme === 'dark' ? 'dark' : 'light'
  useInject(themeAtom, themeRef, setUpstreamTheme)
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
