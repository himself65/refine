import { userInfoAtom, workspaceManager } from '@refine/core/store'
import { inject } from 'jotai-inject'
import { noop } from 'foxact/noop'
import { atom, getDefaultStore } from 'jotai/vanilla'

let injectPromise: Promise<void>
if (typeof window !== 'undefined' && !workspaceManager.injected) {
  injectPromise = workspaceManager.withLocalProvider().
    then(workspaceManager.inject).then(() => {
      console.log('workspaceManager.injected')
    })
} else {
  injectPromise = Promise.resolve()
}

export {
  injectPromise
}

const userId = (((): string => {
  if (typeof window !== 'undefined') {
    let id = localStorage.getItem('anonymous-user-id')
    if (!id) {
      localStorage.setItem('anonymous-user-id', id = window.crypto.randomUUID())
    }
    return id
  } else {
    return 'server-side-no-user-id'
  }
})())

inject(userInfoAtom, () => ({
  username: 'anonymous user',
  id: userId
}), noop)

const primitiveWorkspaceIdAtom = atom<string | null>(null)
const primitivePageIdAtom = atom<string | null>(null)

declare global {
  interface Window {
    initWorkspace: boolean
  }
}

let promise: Promise<void> | null = null

if (typeof window !== 'undefined') {
  if (localStorage.getItem('workspace-id') === null) {
    const randomId = crypto.randomUUID()
    const randomPageId = crypto.randomUUID()
    localStorage.setItem('workspace-id', randomId)
    localStorage.setItem('page-id', randomPageId)
    const workspaceAtom = workspaceManager.getWorkspaceAtom(randomId)
    const store = getDefaultStore()
    promise = store.get(workspaceAtom).then(async workspace => {
      const page = workspace.createPage({
        id: randomPageId
      })
      await page.waitForLoaded()
      const pageBlockId = page.addBlock('affine:page', {
        children: [],
        title: new page.Text('Untitled')
      })
      page.addBlock('affine:surface', {}, pageBlockId)
      const noteBlockId = page.addBlock('affine:note', {}, pageBlockId)
      page.addBlock('affine:paragraph', {}, noteBlockId)
    })
  }
}

export const workspaceIdAtom = atom(async (get) => {
  if (promise) {
    await promise
  }
  const workspaceId = get(primitiveWorkspaceIdAtom)
  if (workspaceId !== null) {
    return workspaceId
  }
  if (typeof window === 'undefined') {
    return crypto.randomUUID()
  } else {
    const item = localStorage.getItem('workspace-id') ?? crypto.randomUUID()
    localStorage.setItem('workspace-id', item)
    return item
  }
}, (_, set, workspaceId: string) => {
  set(primitiveWorkspaceIdAtom, workspaceId)
  if (typeof window !== 'undefined') {
    localStorage.setItem('workspace-id', workspaceId)
  }
})

export const pageIdAtom = atom((get) => {
  const pageId = get(primitivePageIdAtom)
  if (pageId !== null) {
    return pageId
  }
  if (typeof window === 'undefined') {
    return crypto.randomUUID()
  } else {
    const item = localStorage.getItem('page-id') ?? crypto.randomUUID()
    localStorage.setItem('page-id', item)
    return item
  }
}, (_, set, pageId: string) => {
  set(primitivePageIdAtom, pageId)
  if (typeof window !== 'undefined') {
    localStorage.setItem('page-id', pageId)
  }
})
