/**
 * Publishing account, draft task, and writing-template entities.
 *
 * Platform sessions and publishing side effects are owned by the main
 * publishing service; this module only describes their persisted snapshots.
 */

import * as z from 'zod'

import { FileEntryIdSchema } from './file'

export const PUBLISHING_ASSISTANT_ID = '3a3a1fd2-1d92-4cf2-9f83-8d1a8f529b58'

export const PublishingPlatformSchema = z.enum(['wechat', 'douyin', 'xiaohongshu', 'zhihu'])
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

export const PublishingTemplateSourceSchema = z.enum(['generated', 'url', 'pasted'])
export type PublishingTemplateSource = z.infer<typeof PublishingTemplateSourceSchema>

const PublishingTemplateInstructionSchema = z.string().trim().min(1).max(1000)

export const PublishingTemplateSectionSchema = z.strictObject({
  role: z.string().trim().min(1).max(100),
  guidance: PublishingTemplateInstructionSchema,
  required: z.boolean()
})
export type PublishingTemplateSection = z.infer<typeof PublishingTemplateSectionSchema>

export const PublishingTemplateVariableSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  required: z.boolean()
})
export type PublishingTemplateVariable = z.infer<typeof PublishingTemplateVariableSchema>

/** A reusable writing strategy. It intentionally excludes source facts and long copied passages. */
export const PublishingTemplateBlueprintSchema = z.strictObject({
  contentType: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1).max(1000),
  voice: z.array(PublishingTemplateInstructionSchema).max(12),
  structure: z.array(PublishingTemplateSectionSchema).min(1).max(16),
  writingRules: z.array(PublishingTemplateInstructionSchema).max(16),
  avoid: z.array(PublishingTemplateInstructionSchema).max(16),
  variables: z.array(PublishingTemplateVariableSchema).max(16),
  qualityChecks: z.array(PublishingTemplateInstructionSchema).max(16)
})
export type PublishingTemplateBlueprint = z.infer<typeof PublishingTemplateBlueprintSchema>

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
  remoteDraftId: z.string().min(1).optional(),
  editUrl: z.string().url().optional(),
  error: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
})
export type PublishingTask = z.infer<typeof PublishingTaskSchema>

export const PublishingTemplateSchema = z.strictObject({
  id: z.uuidv4(),
  name: z.string().min(1),
  description: z.string().min(1),
  sourceType: PublishingTemplateSourceSchema,
  sourceTitle: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  blueprint: PublishingTemplateBlueprintSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
})
export type PublishingTemplate = z.infer<typeof PublishingTemplateSchema>
