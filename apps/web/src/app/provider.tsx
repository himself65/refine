'use client'
import { ThemeProvider, useTheme } from 'next-themes'
import type { FC, PropsWithChildren } from 'react'
import { themeAtom } from '@mini-affine/core/store'
import { useEffect, useState } from 'react'
import { useHydrateAtoms } from 'jotai/utils'
import { useAtom } from 'jotai/react'

const ThemeProviderInner: FC<PropsWithChildren> = ({
  children
}) => {
  const [theme, setTheme] = useAtom(themeAtom)
  const [initial, setInitial] = useState(true)
  const { setTheme: setUpstreamTheme, theme: upstreamTheme } = useTheme()
  useHydrateAtoms([[themeAtom, upstreamTheme === 'light' ? 'light' : 'dark']])
  useEffect(() => {
    if (initial) {
      setInitial(false)
      setTheme(upstreamTheme === 'light' ? 'light' : 'dark')
    } else if (upstreamTheme !== theme) {
      setUpstreamTheme(theme)
    }
  }, [initial, theme, upstreamTheme, setTheme, setUpstreamTheme])
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
