'use client'
import type { ReactElement } from 'react'
import { Workspace } from '@blocksuite/store'
import { v4 } from 'uuid'
import { useAtomValue } from 'jotai/react'
import { getPageListAtom } from '../../store'

export type PageListProps = {
  workspace: Workspace
}

export const PageList = (
  props: PageListProps
): ReactElement => {
  const {
    workspace
  } = props
  const pageList = useAtomValue(getPageListAtom(workspace))
  return (
    <>
      <div>
        <button
          data-testid='create-page'
          onClick={() => {
            workspace.createPage({
              id: v4()
            })
          }}
        >
          Create Page
        </button>
      </div>
      <table>
        <tbody>
        <tr>
          <th>Title</th>
          <th>ID</th>
          <th>Create Date</th>
        </tr>
        {pageList.map((page) => (
          <tr data-testid='page-item' key={page.id}>
            <td>{page.title}</td>
            <td>{page.id}</td>
            <td>{page.createDate}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </>
  )
}

PageList.displayName = 'RefinePageList'
