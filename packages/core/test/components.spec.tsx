import { describe, it, vi } from 'vitest'
import { Editor } from '../src/components'
import { render } from '@testing-library/react'
import { workspaceManager } from '../src/store'
import { getDefaultStore } from 'jotai/vanilla'
import { promisify } from 'node:util'

const sleep = promisify(setTimeout)

vi.mock('@blocksuite/presets', () => {
  return {
    EditorContainer: class EditorContainer extends HTMLDivElement {}
  }
})

describe('Editor', () => {
  it('should work', async () => {
    const randomId = crypto.randomUUID()
    const workspaceAtom = workspaceManager.getWorkspaceAtom(randomId)
    const store = getDefaultStore()
    const workspace = await store.get(workspaceAtom)
    workspace.createPage({ id: 'page0' })
    const app = render(<Editor workspaceId={randomId} pageId="page0"/>)

    await sleep()

    app.unmount()
  })
})
