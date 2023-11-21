import {
  type LLM,
  ContextChatEngine,
  VectorStoreIndex,
  Document
} from 'llamaindex'

export async function createChatEngine (
  llm: LLM,
  text: string
) {
  const indexer = await VectorStoreIndex.fromDocuments([
    new Document({
      text
    })
  ])

  return new ContextChatEngine({
    chatModel: llm,
    retriever: indexer.asRetriever()
  })
}
