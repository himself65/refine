import type { ReactElement } from 'react'
import type { ThemeAtom } from '../../store/api'
import { useAtomValue } from 'jotai/react'

type SettingProfileProps = {
  themeAtom: ThemeAtom
}

export const SettingProfile = (props: SettingProfileProps): ReactElement => {
  const { themeAtom } = props
  const theme = useAtomValue(themeAtom)
  return (
    <div>
      currentTheme: {theme}
    </div>
  )
}
