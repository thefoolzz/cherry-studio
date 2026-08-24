/** DataApi handlers for publishing account and task persistence. */

import { publishingDataService } from '@data/services/PublishingDataService'
import {
  CreatePublishingAccountSchema,
  CreatePublishingTaskSchema,
  ListPublishingAccountsQuerySchema,
  ListPublishingTasksQuerySchema,
  type PublishingSchemas,
  UpdatePublishingAccountSchema,
  UpdatePublishingTaskSchema
} from '@shared/data/api/schemas/publishing'
import type { HandlersFor } from '@shared/data/api/types'

export const publishingHandlers: HandlersFor<PublishingSchemas> = {
  '/publishing-accounts': {
    GET: async ({ query }) => publishingDataService.listAccounts(ListPublishingAccountsQuerySchema.parse(query ?? {})),
    POST: async ({ body }) => publishingDataService.createAccount(CreatePublishingAccountSchema.parse(body))
  },
  '/publishing-accounts/:id': {
    GET: async ({ params }) => publishingDataService.getAccount(params.id),
    PATCH: async ({ params, body }) =>
      publishingDataService.updateAccount(params.id, UpdatePublishingAccountSchema.parse(body)),
    DELETE: async ({ params }) => {
      publishingDataService.deleteAccount(params.id)
      return undefined
    }
  },
  '/publishing-tasks': {
    GET: async ({ query }) => publishingDataService.listTasks(ListPublishingTasksQuerySchema.parse(query ?? {})),
    POST: async ({ body }) => publishingDataService.createTask(CreatePublishingTaskSchema.parse(body))
  },
  '/publishing-tasks/:id': {
    GET: async ({ params }) => publishingDataService.getTask(params.id),
    PATCH: async ({ params, body }) =>
      publishingDataService.updateTask(params.id, UpdatePublishingTaskSchema.parse(body)),
    DELETE: async ({ params }) => {
      publishingDataService.deleteTask(params.id)
      return undefined
    }
  }
}
