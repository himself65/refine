import { PageList } from '../src/components/page-list'
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Schema, Workspace } from '@blocksuite/store'
import { userEvent } from '@testing-library/user-event'

describe('Component PageList', () => {
  it('should render', async () => {
    const workspace = new Workspace({
      id: 'test',
      schema: new Schema()
    })
    await Promise.all([
      workspace.createPage({
        id: 'page0'
      }),
      workspace.createPage({
        id: 'page1'
      }),
      workspace.createPage({
        id: 'page2'
      })
    ])
    const app = render(<PageList workspace={workspace}/>)
    await waitFor(() => {
      const items = app.getAllByTestId('page-item')
      expect(items.length).toBe(3)
    })
    await vi.waitFor(() => {
      expect(app.getByText('page0')).toBeTruthy()
    })
    const createPageButton = app.getByTestId('create-page') as HTMLDivElement
    await userEvent.click(createPageButton)
    await waitFor(() => {
      const items = app.getAllByTestId('page-item')
      expect(items.length).toBe(4)
    })
    app.unmount()
  })
})
