import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  LayersIcon,
  RowsIcon
} from '@radix-ui/react-icons'
import { type ReactElement } from 'react'

export type EditorHeaderProps = {
  value: 'page' | 'edgeless'
  onValueChange: (value: 'page' | 'edgeless') => void
}

const toggleGroupItemClasses =
  'hover:bg-violet3 dark:hover:bg-violet9 color-mauve11 dark:color-mauve1 data-[state=on]:bg-violet6 dark:data-[state=on]:bg-violet9 data-[state=on]:text-violet12 dark:data-[state=on]:text-white flex h-[35px] w-[35px] items-center justify-center bg-white dark:bg-gray-800 text-base leading-4 first:rounded-l last:rounded-r focus:z-10 focus:shadow-[0_0_0_2px] focus:shadow-black dark:focus:shadow-white focus:outline-none'

export const EditorHeader = ({
  value, onValueChange
}: EditorHeaderProps): ReactElement => {
  return (
    <ToggleGroup.Root
      className="inline-flex bg-mauve6 rounded space-x-px"
      type="single"
      defaultValue="center"
      aria-label="Text alignment"
      value={value}
      onValueChange={onValueChange}
    >
      <ToggleGroup.Item className={toggleGroupItemClasses} value="page"
                        aria-label="Left aligned">
        <RowsIcon/>
      </ToggleGroup.Item>
      <ToggleGroup.Item className={toggleGroupItemClasses} value="edgeless"
                        aria-label="Center aligned">
        <LayersIcon/>
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  )
}

EditorHeader.displayName = 'EditorHeader'
