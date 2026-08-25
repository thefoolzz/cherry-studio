import { application } from '@application'
import type { publishingRequestSchemas } from '@shared/ipc/schemas/publishing'
import type { IpcHandlersFor } from '@shared/ipc/types'

export const publishingHandlers: IpcHandlersFor<typeof publishingRequestSchemas> = {
  'publishing.start_account_binding': ({ platform, returnTopicId }) =>
    application.get('PublishingService').startAccountBinding(platform, returnTopicId),
  'publishing.open_account': ({ accountId }) => application.get('PublishingService').openAccount(accountId),
  'publishing.rename_account': ({ accountId, displayName }) =>
    Promise.resolve(application.get('PublishingService').renameAccount(accountId, displayName)),
  'publishing.delete_account': ({ accountId }) => application.get('PublishingService').deleteAccount(accountId),
  'publishing.get_account_status': ({ accountId }) => application.get('PublishingService').getAccountStatus(accountId),
  'publishing.prepare_draft': ({ accountId, title, markdown, bodyImageFileIds, coverFileId }) =>
    Promise.resolve(
      application.get('PublishingService').prepareDraft({
        accountId,
        title,
        markdown,
        bodyImageFileIds,
        coverFileEntryId: coverFileId
      })
    ),
  'publishing.create_draft': ({ taskId }) => application.get('PublishingService').createDraft(taskId),
  'publishing.retry_publish_task': ({ taskId }) => application.get('PublishingService').retryPublishTask(taskId),
  'publishing.cancel_publish_task': ({ taskId }) =>
    Promise.resolve(application.get('PublishingService').cancelPublishTask(taskId)),
  'publishing.open_edit_url': ({ taskId }) => application.get('PublishingService').openEditUrl(taskId)
}
