/**
 * Publishing account and draft task entities.
 *
 * Platform sessions and publishing side effects are owned by the main
 * publishing service; this module only describes their persisted snapshots.
 */

import * as z from 'zod'

import { FileEntryIdSchema } from './file'

export const PUBLISHING_ASSISTANT_ID = '3a3a1fd2-1d92-4cf2-9f83-8d1a8f529b58'

export const PublishingPlatformSchema = z.enum(['wechat'])
export type PublishingPlatform = z.infer<typeof PublishingPlatformSchema>

export const PublishingAccountStatusSchema = z.enum(['binding', 'ready', 'expired'])
export type PublishingAccountStatus = z.infer<typeof PublishingAccountStatusSchema>

export const PublishingTaskStatusSchema = z.enum([
  'prepared',
  'opening',
  'uploading',
  'creating',
  'created',
  'failed',
  'cancelled'
])
export type PublishingTaskStatus = z.infer<typeof PublishingTaskStatusSchema>

export const PublishingAccountSchema = z.strictObject({
  id: z.uuidv4(),
  platform: PublishingPlatformSchema,
  displayName: z.string().min(1),
  partition: z.string().min(1),
  status: PublishingAccountStatusSchema,
  lastVerifiedAt: z.number().int().nonnegative().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
})
export type PublishingAccount = z.infer<typeof PublishingAccountSchema>

export const PublishingTaskSchema = z.strictObject({
  id: z.uuidv4(),
  accountId: z.uuidv4(),
  title: z.string().min(1),
  markdown: z.string().min(1),
  imageFileEntryIds: z.array(FileEntryIdSchema),
  coverFileEntryId: FileEntryIdSchema.optional(),
  status: PublishingTaskStatusSchema,
  appMsgId: z.string().min(1).optional(),
  editUrl: z.string().url().optional(),
  error: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
})
export type PublishingTask = z.infer<typeof PublishingTaskSchema>
