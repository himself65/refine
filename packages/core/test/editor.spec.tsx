import { describe, expect, test, vi } from 'vitest'
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
    const store = getDefaultStore()
    const workspaceAtom = workspaceManager.getWorkspaceAtom('workspace:0')
    const workspace = await store.get(workspaceAtom)
    const page = workspace.createPage({
      id: 'page0'
    })
    const onLoad = vi.fn(() => {
      return () => {}
    })
    const app = render(
      <BlockSuiteEditor
        className='editor'
        mode="page"
        page={page}
        onLoad={onLoad}
      />
    )
    await sleep()
    app.unmount()
  })
})
