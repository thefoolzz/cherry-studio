import {
  type PublishingAccount,
  PublishingAccountSchema,
  PublishingPlatformSchema,
  PublishingTaskSchema
} from '@shared/data/types/publishing'
import * as z from 'zod'

import { defineRoute } from '../define'

const accountId = z.string().min(1)
const taskId = z.string().min(1)

export const publishingRequestSchemas = {
  'publishing.start_account_binding': defineRoute({
    input: z.strictObject({
      platform: PublishingPlatformSchema,
      returnTopicId: z.string().min(1).optional()
    }),
    output: PublishingAccountSchema
  }),
  'publishing.open_account': defineRoute({
    input: z.strictObject({ accountId }),
    output: z.void()
  }),
  'publishing.rename_account': defineRoute({
    input: z.strictObject({ accountId, displayName: z.string().trim().min(1).max(120) }),
    output: PublishingAccountSchema
  }),
  'publishing.delete_account': defineRoute({
    input: z.strictObject({ accountId }),
    output: z.void()
  }),
  'publishing.get_account_status': defineRoute({
    input: z.strictObject({ accountId }),
    output: PublishingAccountSchema
  }),
  'publishing.prepare_draft': defineRoute({
    input: z.strictObject({
      accountId,
      title: z.string().trim().min(1).max(255),
      markdown: z.string().min(1),
      bodyImageFileIds: z.array(z.string().min(1)).max(64).optional(),
      coverFileId: z.string().min(1).optional()
    }),
    output: PublishingTaskSchema
  }),
  'publishing.create_draft': defineRoute({
    input: z.strictObject({ taskId }),
    output: PublishingTaskSchema
  }),
  'publishing.retry_publish_task': defineRoute({
    input: z.strictObject({ taskId }),
    output: PublishingTaskSchema
  }),
  'publishing.cancel_publish_task': defineRoute({
    input: z.strictObject({ taskId }),
    output: PublishingTaskSchema
  }),
  'publishing.open_edit_url': defineRoute({
    input: z.strictObject({ taskId }),
    output: z.void()
  })
}

export type PublishingEventSchemas = {
  'publishing.account.updated': { account: PublishingAccount; deleted: boolean }
  'publishing.task.updated': z.infer<typeof PublishingTaskSchema>
}
