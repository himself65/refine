import { chatAtoms } from 'jotai-ai'
import type { Page } from '@blocksuite/store'
import { encodeStateAsUpdate } from 'yjs'
import { encodeBase64 } from '@endo/base64'
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react'
import type { ChatRequestData } from '../../type'

export type ChatButtonProps = {
  page: Page
}

const {
  messagesAtom,
  inputAtom,
  isLoadingAtom,
  submitAtom
} = chatAtoms({
  api: process.env.NEXT_PUBLIC_CHAT_API
})

export const ChatButton = (props: ChatButtonProps) => {
  const { page } = props
  const messages = useAtomValue(messagesAtom)
  const [input, handleInputChange] = useAtom(inputAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const handleSubmit = useSetAtom(submitAtom)

  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      <form
        onSubmit={async (e) => {
          const workspaceUpdate = encodeStateAsUpdate(page.workspace.doc)
          const pageUpdate = encodeStateAsUpdate(page.spaceDoc)
          const workspaceId = page.workspace.id
          const pageId = page.id
          await handleSubmit(e, {
            data: {
              workspaceId,
              pageId,
              workspaceUpdate: encodeBase64(workspaceUpdate),
              pageUpdate: encodeBase64(pageUpdate)
            } satisfies ChatRequestData
          })
        }}
        className="flex w-full items-start justify-between gap-4 rounded-xl bg-white p-4 shadow-xl dark:bg-black"
      >
        <input
          autoFocus
          name="message"
          placeholder="Type a message"
          className="flex-1"
          value={input}
          onChange={handleInputChange}
        />
        <button type="submit" disabled={isLoading}>
          Send message
        </button>
      </form>
    </>
  )
}
