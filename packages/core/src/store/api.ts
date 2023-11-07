import { atom } from 'jotai/vanilla'
import { settingAtom } from './preference'

export type Theme = 'light' | 'dark'
export type User = {
  username: string
  id: string
}

// need inject from upstream
export const userInfoAtom = atom<User>(null as unknown as User)
export type ThemeAtom = ReturnType<typeof settingAtom<Theme>>
