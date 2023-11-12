import {
  drizzle,
  type BetterSQLite3Database
} from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import {
  text,
  integer,
  blob,
  sqliteTable,
  index
} from 'drizzle-orm/sqlite-core'
import type { DataSourceAdapter } from 'y-utils'
import { sql } from 'drizzle-orm'
import { diffUpdate, mergeUpdates } from 'yjs'

export const workspaceTable = sqliteTable('users', {
  id: integer('id').primaryKey({
    autoIncrement: true
  }),
  guid: text('guid').notNull(),
  update: blob('update', { mode: 'buffer' }).notNull(),
  origin: text('origin').notNull()
}, table => {
  return {
    guidIndex: index('guid_index').on(table.guid)
  }
})

export function createServerDataSource (filename: string) {
  const sqlite = new Database(filename)
  const db: BetterSQLite3Database = drizzle(sqlite)
  return {
    queryDocState: async (guid, query) => {
      const result = db.select().from(workspaceTable).where(sql`
          ${workspaceTable.guid}
          =
          ${guid}
      `).all()
      const update = mergeUpdates(result.map(row => row.update))
      if (query?.stateVector) {
        return {
          missingUpdate: diffUpdate(update, query.stateVector)
        }
      } else {
        return {
          missingUpdate: update
        }
      }
    },
    sendDocUpdate: async (guid, update, origin) => {
      db.insert(workspaceTable).values({
        guid,
        update: Buffer.from(update),
        origin
      })
    },
    onDocUpdate: () => {
      return () => {}
    }
  } satisfies DataSourceAdapter
}
