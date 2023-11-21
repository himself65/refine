import { type Message, StreamingTextResponse } from 'ai'
import { OpenAI } from 'llamaindex'
import { NextRequest, NextResponse } from 'next/server'
import { createChatEngine } from './engine'
import { LlamaIndexStream } from './llamaindex-stream'
import { decodeBase64 } from '@endo/base64'
import { applyUpdate } from 'yjs'
import { workspaceManager } from '@refine/core/workspace-manager'
import { getDefaultStore } from 'jotai/vanilla'
import type { ChatRequestData } from '../../../type'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST (request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, data }: {
      messages: Message[],
      data: ChatRequestData
    } = body
    const {
      workspaceId,
      pageId,
      workspaceUpdate,
      pageUpdate
    } = data

    // init blocksuite store
    const store = getDefaultStore()
    const workspaceAtom = workspaceManager.getWorkspaceAtom(workspaceId)
    const workspace = await store.get(workspaceAtom)
    applyUpdate(workspace.doc, decodeBase64(workspaceUpdate))
    const pageAtom = workspaceManager.getWorkspacePageAtom(workspaceId, pageId)
    const page = await store.get(pageAtom)
    await page.waitForLoaded()
    applyUpdate(page.spaceDoc, decodeBase64(pageUpdate))
    const blocks = page.spaceDoc.getMap('blocks').
      toJSON() as Record<string, Record<string, unknown>>
    let markdown = ''
    for (const blockId in blocks) {
      const block = blocks[blockId]
      if ('prop:title' in block) {
        markdown += `#${block['prop:title']}` + '\n'
      } else if ('prop:text' in block) {
        if (block['sys:flavour'] === 'affine:list') {
          markdown += '- '
        }
        if (block['prop:type'] === 'todo') {
          if (block['prop:checked'] === true) {
            markdown += '[x] '
          } else {
            markdown += '[ ] '
          }
        }
        markdown += block['prop:text'] + '\n'
      }
    }
    const lastMessage = messages.pop()
    if (!messages || !lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        {
          error:
            'messages are required in the request body and the last message must be from the user'
        },
        { status: 400 }
      )
    }

    const llm = new OpenAI({
      model: 'gpt-3.5-turbo'
    })

    const chatEngine = await createChatEngine(llm, markdown)

    const response = await chatEngine.chat(lastMessage.content, messages, true)

    // Transform the response into a readable stream
    const stream = LlamaIndexStream(response)

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error('[LlamaIndex]', error)
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      {
        status: 500
      }
    )
  }
}
