import { type Meta } from '@storybook/react'

import { PageList } from '../components/page-list'
import { workspaceManager } from '../store'
import { getDefaultStore } from 'jotai/vanilla'

const meta: Meta<typeof PageList> = {
  title: 'Page List',
  component: PageList
}

export default meta

const workspaceAtom = workspaceManager.getWorkspaceAtom('workspace0')
const store = getDefaultStore()

const workspace = await store.get(workspaceAtom)

export const Default = () => <PageList workspace={workspace}/>
