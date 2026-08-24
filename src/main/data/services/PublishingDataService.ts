/**
 * DataApi persistence for publishing accounts and draft tasks.
 *
 * Window/session management and platform network calls belong to the lifecycle
 * publishing service; this service only reads and writes SQLite rows.
 */

import { application } from '@application'
import { notifyDataApiDataChange } from '@data/dataApiDataChange'
import { publishingAccountTable, publishingTaskTable } from '@data/db/schemas/publishing'
import { defaultHandlersFor, withSqliteErrors } from '@data/db/sqliteErrors'
import { loggerService } from '@logger'
import { DataApiErrorFactory } from '@shared/data/api/errors'
import type {
  CreatePublishingAccountDto,
  CreatePublishingTaskDto,
  ListPublishingAccountsQuery,
  ListPublishingTasksQuery,
  PublishingAccountListResponse,
  PublishingTaskListResponse,
  UpdatePublishingAccountDto,
  UpdatePublishingTaskDto
} from '@shared/data/api/schemas/publishing'
import {
  type PublishingAccount,
  PublishingAccountStatusSchema,
  PublishingPlatformSchema,
  type PublishingTask,
  PublishingTaskStatusSchema
} from '@shared/data/types/publishing'
import { and, asc, desc, eq, type SQL, sql } from 'drizzle-orm'

import { nullsToUndefined, timestampToISO } from './utils/rowMappers'

const logger = loggerService.withContext('DataApi:PublishingDataService')

function rowToAccount(row: typeof publishingAccountTable.$inferSelect): PublishingAccount {
  const clean = nullsToUndefined(row)
  return {
    id: row.id,
    platform: PublishingPlatformSchema.parse(row.platform),
    displayName: row.displayName,
    partition: row.partition,
    status: PublishingAccountStatusSchema.parse(row.status),
    lastVerifiedAt: clean.lastVerifiedAt,
    createdAt: timestampToISO(row.createdAt),
    updatedAt: timestampToISO(row.updatedAt)
  }
}

function rowToTask(row: typeof publishingTaskTable.$inferSelect): PublishingTask {
  const clean = nullsToUndefined(row)
  return {
    id: row.id,
    accountId: row.accountId,
    title: row.title,
    markdown: row.markdown,
    imageFileEntryIds: row.imageFileEntryIds,
    coverFileEntryId: clean.coverFileEntryId,
    status: PublishingTaskStatusSchema.parse(row.status),
    remoteDraftId: clean.remoteDraftId,
    editUrl: clean.editUrl,
    error: clean.error,
    createdAt: timestampToISO(row.createdAt),
    updatedAt: timestampToISO(row.updatedAt)
  }
}

export class PublishingDataService {
  private get db() {
    return application.get('DbService').getDb()
  }

  listAccounts(query: ListPublishingAccountsQuery = {}): PublishingAccountListResponse {
    const conditions: SQL[] = []
    if (query.platform !== undefined) conditions.push(eq(publishingAccountTable.platform, query.platform))
    if (query.status !== undefined) conditions.push(eq(publishingAccountTable.status, query.status))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0
    const rows = this.db
      .select()
      .from(publishingAccountTable)
      .where(where)
      .orderBy(asc(publishingAccountTable.displayName), asc(publishingAccountTable.id))
      .limit(limit)
      .offset(offset)
      .all()
    const [{ count }] = this.db.select({ count: sql<number>`count(*)` }).from(publishingAccountTable).where(where).all()
    return { items: rows.map(rowToAccount), total: count, page: Math.floor(offset / limit) + 1 }
  }

  getAccount(id: string): PublishingAccount {
    const [row] = this.db.select().from(publishingAccountTable).where(eq(publishingAccountTable.id, id)).limit(1).all()
    if (!row) throw DataApiErrorFactory.notFound('PublishingAccount', id)
    return rowToAccount(row)
  }

  createAccount(dto: CreatePublishingAccountDto, id?: string): PublishingAccount {
    const [row] = withSqliteErrors(
      () =>
        this.db
          .insert(publishingAccountTable)
          .values({
            ...(id ? { id } : {}),
            platform: dto.platform,
            displayName: dto.displayName,
            partition: dto.partition
          })
          .returning()
          .all(),
      {
        ...defaultHandlersFor('PublishingAccount', dto.displayName),
        unique: () =>
          DataApiErrorFactory.conflict(
            `Publishing account partition '${dto.partition}' already exists`,
            'PublishingAccount'
          )
      }
    )
    const account = rowToAccount(row)
    notifyDataApiDataChange([{ endpoint: '/publishing-accounts', kind: 'membership', entityIds: [account.id] }])
    logger.info('Created publishing account', { id: account.id, platform: account.platform })
    return account
  }

  updateAccount(id: string, dto: UpdatePublishingAccountDto): PublishingAccount {
    const updates: Partial<typeof publishingAccountTable.$inferInsert> = {}
    if (dto.displayName !== undefined) updates.displayName = dto.displayName
    if (dto.status !== undefined) updates.status = dto.status
    if (dto.lastVerifiedAt !== undefined) updates.lastVerifiedAt = dto.lastVerifiedAt
    if (Object.keys(updates).length === 0) return this.getAccount(id)
    const [row] = withSqliteErrors(
      () =>
        this.db.update(publishingAccountTable).set(updates).where(eq(publishingAccountTable.id, id)).returning().all(),
      defaultHandlersFor('PublishingAccount', id)
    )
    if (!row) throw DataApiErrorFactory.notFound('PublishingAccount', id)
    const account = rowToAccount(row)
    notifyDataApiDataChange([{ endpoint: '/publishing-accounts', kind: 'projection', entityIds: [id] }])
    logger.info('Updated publishing account', { id, changes: Object.keys(dto) })
    return account
  }

  deleteAccount(id: string): void {
    const [row] = this.db
      .delete(publishingAccountTable)
      .where(eq(publishingAccountTable.id, id))
      .returning({ id: publishingAccountTable.id })
      .all()
    if (!row) throw DataApiErrorFactory.notFound('PublishingAccount', id)
    notifyDataApiDataChange([
      { endpoint: '/publishing-accounts', kind: 'membership', entityIds: [id] },
      { endpoint: '/publishing-tasks', kind: 'membership' }
    ])
    logger.info('Deleted publishing account', { id })
  }

  listTasks(query: ListPublishingTasksQuery = {}): PublishingTaskListResponse {
    const conditions: SQL[] = []
    if (query.accountId !== undefined) conditions.push(eq(publishingTaskTable.accountId, query.accountId))
    if (query.status !== undefined) conditions.push(eq(publishingTaskTable.status, query.status))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0
    const rows = this.db
      .select()
      .from(publishingTaskTable)
      .where(where)
      .orderBy(desc(publishingTaskTable.createdAt), desc(publishingTaskTable.id))
      .limit(limit)
      .offset(offset)
      .all()
    const [{ count }] = this.db.select({ count: sql<number>`count(*)` }).from(publishingTaskTable).where(where).all()
    return { items: rows.map(rowToTask), total: count, page: Math.floor(offset / limit) + 1 }
  }

  getTask(id: string): PublishingTask {
    const [row] = this.db.select().from(publishingTaskTable).where(eq(publishingTaskTable.id, id)).limit(1).all()
    if (!row) throw DataApiErrorFactory.notFound('PublishingTask', id)
    return rowToTask(row)
  }

  createTask(dto: CreatePublishingTaskDto): PublishingTask {
    this.getAccount(dto.accountId)
    const [row] = this.db
      .insert(publishingTaskTable)
      .values({
        accountId: dto.accountId,
        title: dto.title,
        markdown: dto.markdown,
        imageFileEntryIds: dto.imageFileEntryIds,
        coverFileEntryId: dto.coverFileEntryId
      })
      .returning()
      .all()
    const task = rowToTask(row)
    notifyDataApiDataChange([{ endpoint: '/publishing-tasks', kind: 'membership', entityIds: [task.id] }])
    logger.info('Created publishing task', { id: task.id, accountId: task.accountId })
    return task
  }

  updateTask(id: string, dto: UpdatePublishingTaskDto): PublishingTask {
    const updates: Partial<typeof publishingTaskTable.$inferInsert> = {}
    if (dto.title !== undefined) updates.title = dto.title
    if (dto.markdown !== undefined) updates.markdown = dto.markdown
    if (dto.imageFileEntryIds !== undefined) updates.imageFileEntryIds = dto.imageFileEntryIds
    if (dto.coverFileEntryId !== undefined) updates.coverFileEntryId = dto.coverFileEntryId
    if (dto.status !== undefined) updates.status = dto.status
    if (dto.remoteDraftId !== undefined) updates.remoteDraftId = dto.remoteDraftId
    if (dto.editUrl !== undefined) updates.editUrl = dto.editUrl
    if (dto.error !== undefined) updates.error = dto.error
    if (Object.keys(updates).length === 0) return this.getTask(id)
    const [row] = this.db
      .update(publishingTaskTable)
      .set(updates)
      .where(eq(publishingTaskTable.id, id))
      .returning()
      .all()
    if (!row) throw DataApiErrorFactory.notFound('PublishingTask', id)
    const task = rowToTask(row)
    notifyDataApiDataChange([{ endpoint: '/publishing-tasks', kind: 'projection', entityIds: [id] }])
    logger.info('Updated publishing task', { id, changes: Object.keys(dto) })
    return task
  }

  deleteTask(id: string): void {
    const [row] = this.db
      .delete(publishingTaskTable)
      .where(eq(publishingTaskTable.id, id))
      .returning({ id: publishingTaskTable.id })
      .all()
    if (!row) throw DataApiErrorFactory.notFound('PublishingTask', id)
    notifyDataApiDataChange([{ endpoint: '/publishing-tasks', kind: 'membership', entityIds: [id] }])
    logger.info('Deleted publishing task', { id })
  }
}

export const publishingDataService = new PublishingDataService()
