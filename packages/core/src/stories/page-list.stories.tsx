import type { Meta, StoryFn } from '@storybook/react'

import { PageList, type PageListProps } from '../components/page-list'
import { workspaceManager } from '../store'
import {
  within,
  userEvent,
  waitForElementToBeRemoved
} from '@storybook/testing-library'
import { expect } from '@storybook/jest'
import { Suspense, useId } from 'react'
import { useAtomValue } from 'jotai/react'

const Impl = (props: PageListProps) => {
  const workspaceAtom = workspaceManager.getWorkspaceAtom(useId())
  const workspace = useAtomValue(workspaceAtom)
  return (
    <PageList {...props} workspace={workspace}/>
  )
}

const App = (props: PageListProps) => {
  return (
    <Suspense fallback={
      <div role="progressbar">Loading...</div>
    }>
      <Impl {...props}/>
    </Suspense>
  )
}

const meta: Meta<PageListProps> = {
  title: 'Page List',
  component: App
}

export default meta

export const Default: StoryFn<PageListProps> = (props) => (<App {...props}/>)

Default.play = async ({
  canvasElement
}) => {
  const canvas = within(canvasElement)
  await waitForElementToBeRemoved(
    canvasElement.querySelector('div[role="progressbar"]')
  )
  const createButton = canvas.getByTestId('create-page')
  await userEvent.click(createButton)
  expect(canvas.getAllByTestId('page-item').length).toBe(1)
  await userEvent.click(createButton)
  expect(canvas.getAllByTestId('page-item').length).toBe(2)
}
