import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { createUpdateTimestamps, uuidPrimaryKey } from './_columnHelpers'
import { fileEntryTable } from './file'

/** Persisted publishing accounts; credentials remain in the Electron session partition. */
export const publishingAccountTable = sqliteTable(
  'publishing_account',
  {
    id: uuidPrimaryKey(),
    platform: text().notNull(),
    displayName: text('display_name').notNull(),
    partition: text().notNull(),
    status: text().notNull().default('binding'),
    lastVerifiedAt: integer('last_verified_at'),
    ...createUpdateTimestamps
  },
  (t) => [
    uniqueIndex('publishing_account_partition_unique_idx').on(t.partition),
    index('publishing_account_platform_status_idx').on(t.platform, t.status),
    check('publishing_account_platform_check', sql`${t.platform} IN ('wechat', 'douyin', 'xiaohongshu', 'zhihu')`),
    check('publishing_account_status_check', sql`${t.status} IN ('binding', 'ready', 'expired')`),
    check('publishing_account_display_name_check', sql`length(trim(${t.displayName})) > 0`),
    check('publishing_account_partition_check', sql`length(trim(${t.partition})) > 0`)
  ]
)

/** Persisted content snapshots and their asynchronous draft-creation state. */
export const publishingTaskTable = sqliteTable(
  'publishing_task',
  {
    id: uuidPrimaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => publishingAccountTable.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    markdown: text().notNull(),
    imageFileEntryIds: text('image_file_entry_ids', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    coverFileEntryId: text('cover_file_entry_id').references(() => fileEntryTable.id, { onDelete: 'set null' }),
    status: text().notNull().default('prepared'),
    remoteDraftId: text('remote_draft_id'),
    editUrl: text('edit_url'),
    error: text(),
    ...createUpdateTimestamps
  },
  (t) => [
    index('publishing_task_account_created_at_idx').on(t.accountId, t.createdAt),
    index('publishing_task_status_created_at_idx').on(t.status, t.createdAt),
    check(
      'publishing_task_status_check',
      sql`${t.status} IN ('prepared', 'opening', 'uploading', 'creating', 'created', 'failed', 'cancelled')`
    ),
    check('publishing_task_title_check', sql`length(trim(${t.title})) > 0`),
    check('publishing_task_markdown_check', sql`length(trim(${t.markdown})) > 0`)
  ]
)

export type PublishingAccountRow = typeof publishingAccountTable.$inferSelect
export type InsertPublishingAccountRow = typeof publishingAccountTable.$inferInsert
export type PublishingTaskRow = typeof publishingTaskTable.$inferSelect
export type InsertPublishingTaskRow = typeof publishingTaskTable.$inferInsert
