import { atom } from 'jotai/vanilla'

export type Theme = 'light' | 'dark'

export const themeAtom = atom<Theme>('light')
