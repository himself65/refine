import { type ReactElement, useMemo } from 'react'
import { use } from 'react'
import { getWorkspaceAtom } from './store'
import { BlockSuiteEditor } from './components/editor'
import { useAtomValue } from 'jotai/react'

export const App = (): ReactElement => {
  const [
    workspaceAtom,
    effectAtom
  ] = getWorkspaceAtom('workspace:0')
  const workspace = useAtomValue(workspaceAtom)
  useAtomValue(effectAtom)
  const page = useMemo(() => {
    let page = workspace.getPage('page0')
    if (!page) {
      page = workspace.createPage('page0')
      const pageNotNull = page
      pageNotNull.waitForLoaded().then(() => {
        const pageBlockId = pageNotNull.addBlock('affine:page', {
          children: [],
          title: new pageNotNull.Text('Untitled')
        })
        pageNotNull.addBlock('affine:surface', {}, pageBlockId)
        const noteBlockId = pageNotNull.addBlock('affine:note', {}, pageBlockId)
        pageNotNull.addBlock('affine:paragraph', {}, noteBlockId)
      })
    }
    return page
  }, [workspace])

  if (!page.loaded) {
    use(page.waitForLoaded())
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw'
    }}>
      <BlockSuiteEditor mode="page" page={page}/>
    </div>
  )
}
