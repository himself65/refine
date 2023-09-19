import { type ReactElement, useMemo } from 'react'
import { use } from 'react'
import './App.css'
import { getOrCreateWorkspace } from './store'

export const App = (): ReactElement => {

  const workspace = useMemo(() => {
    return getOrCreateWorkspace('id')
  }, [])
  const page = useMemo(() => {
    let page = workspace.getPage('page0')
    if (!page) {
      page = workspace.createPage('page0')

    }
    return page
  }, [workspace])

  if (!page.loaded) {
    use(page.waitForLoaded().then(() => {
      if (page.isEmpty) {
        const pageBlockId = page.addBlock('affine:page', {
          title: new page.Text('Untitled')
        })
        page.addBlock('affine:surface', {}, pageBlockId)
        const noteBlockId = page.addBlock('affine:note', {}, pageBlockId)
        page.addBlock('affine:paragraph', {}, noteBlockId)
      }
    }))
  }

  console.log(page)

  return (
    <div>

    </div>
  )
}
