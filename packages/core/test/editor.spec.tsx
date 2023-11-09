import { describe, test, vi } from 'vitest'
import { BlockSuiteEditor } from '../src/components/editor'
import { render } from '@testing-library/react'
import { workspaceManager } from '../src/store'
import { getDefaultStore } from 'jotai/vanilla'
import { promisify } from 'node:util'

const sleep = promisify(setTimeout)

vi.mock('@blocksuite/editor', () => {
  return {
    EditorContainer: class EditorContainer extends HTMLDivElement {}
  }
})

describe('Editor', () => {
  test('should render correctly', async () => {
    const randomId = crypto.randomUUID()
    const store = getDefaultStore()
    const workspaceAtom = workspaceManager.getWorkspaceAtom(randomId)
    const workspace = await store.get(workspaceAtom)
    const page = workspace.createPage({
      id: 'page0'
    })
    const onLoad = vi.fn(() => {
      return () => {}
    })
    const app = render(
      <BlockSuiteEditor
        className="editor"
        mode="page"
        page={page}
        onLoad={onLoad}
      />
    )
    await sleep()
    app.unmount()
  })

  test('should render correctly without onLoad', async () => {
    const randomId = crypto.randomUUID()
    const store = getDefaultStore()
    const workspaceAtom = workspaceManager.getWorkspaceAtom(randomId)
    const workspace = await store.get(workspaceAtom)
    const page = workspace.createPage({
      id: 'page0'
    })
    const app = render(
      <BlockSuiteEditor
        className="editor"
        mode="page"
        page={page}
      />
    )
    await sleep()
    app.unmount()
  })
})
