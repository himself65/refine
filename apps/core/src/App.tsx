import { type ReactElement, use, useMemo } from 'react'
import { currentWorkspaceAtom } from './store'
import { BlockSuiteEditor } from './components/editor'
import { useAtom, useAtomValue } from 'jotai/react'
import { useKeyboardEvent } from '@react-hookz/web'
import { atom } from 'jotai/vanilla'

const modeAtom = atom<'page' | 'edgeless'>('page')

export const App = (): ReactElement => {
  const workspace = useAtomValue(currentWorkspaceAtom)
  const page = useMemo(() => {
    const page = workspace.getPage('page0')
    if (page === null) {
      const page = workspace.createPage('page0')
      page.waitForLoaded().then(() => {
        const pageBlockId = page.addBlock('affine:page', {
          children: [],
          title: new page.Text('Untitled')
        })
        page.addBlock('affine:surface', {}, pageBlockId)
        const noteBlockId = page.addBlock('affine:note', {}, pageBlockId)
        page.addBlock('affine:paragraph', {}, noteBlockId)
      })
      return page
    }
    return page
  }, [workspace])

  const [pageMode, setPageMode] = useAtom(modeAtom)

  useKeyboardEvent(
    true,
    (ev) => {
      if (ev.metaKey && ev.key === 'e') {
        setPageMode(mode => mode === 'page' ? 'edgeless' : 'page')
      }
    },
    [setPageMode],
    { eventOptions: { passive: true } }
  );

  if (!page.loaded) {
    use(page.waitForLoaded())
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw'
    }}>
      <BlockSuiteEditor mode={pageMode} page={page}/>
    </div>
  )
}
