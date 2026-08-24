/** Data API contracts for persisted publishing accounts and draft tasks. */

import * as z from 'zod'

import { FileEntryIdSchema } from '../../types/file'
import {
  type PublishingAccount,
  PublishingAccountStatusSchema,
  PublishingPlatformSchema,
  type PublishingTask,
  PublishingTaskStatusSchema
} from '../../types/publishing'
import type { OffsetPaginationResponse } from '../types'

const PUBLISHING_LIST_MAX_LIMIT = 200

export const CreatePublishingAccountSchema = z.strictObject({
  platform: PublishingPlatformSchema,
  displayName: z.string().trim().min(1).max(200),
  partition: z.string().trim().min(1).max(200)
})
export type CreatePublishingAccountDto = z.infer<typeof CreatePublishingAccountSchema>

export const UpdatePublishingAccountSchema = z
  .strictObject({
    displayName: z.string().trim().min(1).max(200).optional(),
    status: PublishingAccountStatusSchema.optional(),
    lastVerifiedAt: z.number().int().nonnegative().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'at least one account field is required' })
export type UpdatePublishingAccountDto = z.infer<typeof UpdatePublishingAccountSchema>

export const ListPublishingAccountsQuerySchema = z.strictObject({
  platform: PublishingPlatformSchema.optional(),
  status: PublishingAccountStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(PUBLISHING_LIST_MAX_LIMIT).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
})
export type ListPublishingAccountsQuery = z.infer<typeof ListPublishingAccountsQuerySchema>

export const CreatePublishingTaskSchema = z.strictObject({
  accountId: z.uuidv4(),
  title: z.string().trim().min(1).max(500),
  markdown: z.string().min(1).max(1_000_000),
  imageFileEntryIds: z.array(FileEntryIdSchema).max(100).default([]),
  coverFileEntryId: FileEntryIdSchema.optional()
})
export type CreatePublishingTaskDto = z.infer<typeof CreatePublishingTaskSchema>

export const UpdatePublishingTaskSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(500).optional(),
    markdown: z.string().min(1).max(1_000_000).optional(),
    imageFileEntryIds: z.array(FileEntryIdSchema).max(100).optional(),
    coverFileEntryId: FileEntryIdSchema.nullable().optional(),
    status: PublishingTaskStatusSchema.optional(),
    remoteDraftId: z.string().trim().min(1).nullable().optional(),
    editUrl: z.string().url().nullable().optional(),
    error: z.string().trim().min(1).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'at least one task field is required' })
export type UpdatePublishingTaskDto = z.infer<typeof UpdatePublishingTaskSchema>

export const ListPublishingTasksQuerySchema = z.strictObject({
  accountId: z.uuidv4().optional(),
  status: PublishingTaskStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(PUBLISHING_LIST_MAX_LIMIT).optional(),
  offset: z.coerce.number().int().nonnegative().optional()
})
export type ListPublishingTasksQuery = z.infer<typeof ListPublishingTasksQuerySchema>

export interface PublishingAccountListResponse extends OffsetPaginationResponse<PublishingAccount> {
  items: PublishingAccount[]
}

export interface PublishingTaskListResponse extends OffsetPaginationResponse<PublishingTask> {
  items: PublishingTask[]
}

export type PublishingSchemas = {
  '/publishing-accounts': {
    GET: {
      query?: ListPublishingAccountsQuery
      response: PublishingAccountListResponse
    }
    POST: {
      body: CreatePublishingAccountDto
      response: PublishingAccount
    }
  }
  '/publishing-accounts/:id': {
    GET: {
      params: { id: string }
      response: PublishingAccount
    }
    PATCH: {
      params: { id: string }
      body: UpdatePublishingAccountDto
      response: PublishingAccount
    }
    DELETE: {
      params: { id: string }
      response: void
    }
  }
  '/publishing-tasks': {
    GET: {
      query?: ListPublishingTasksQuery
      response: PublishingTaskListResponse
    }
    POST: {
      body: CreatePublishingTaskDto
      response: PublishingTask
    }
  }
  '/publishing-tasks/:id': {
    GET: {
      params: { id: string }
      response: PublishingTask
    }
    PATCH: {
      params: { id: string }
      body: UpdatePublishingTaskDto
      response: PublishingTask
    }
    DELETE: {
      params: { id: string }
      response: void
    }
  }
}
