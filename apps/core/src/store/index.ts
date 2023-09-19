import { Schema, Workspace } from '@blocksuite/store'
import { AffineSchemas, __unstableSchemas } from '@blocksuite/blocks/models'

const schema = new Schema()

schema.register(AffineSchemas).register(__unstableSchemas)

const workspaceMap = new Map<string, Workspace>()

export function getOrCreateWorkspace (id: string) {
  let workspace = workspaceMap.get(id)
  if (!workspace) {
    workspace = new Workspace({
      id,
      schema
    })
    workspaceMap.set(id, workspace)
  }
  return workspace
}
