import { application } from '@application'
import type { publishingRequestSchemas } from '@shared/ipc/schemas/publishing'
import type { IpcHandlersFor } from '@shared/ipc/types'

export const publishingHandlers: IpcHandlersFor<typeof publishingRequestSchemas> = {
  'publishing.start_account_binding': ({ displayName, returnTopicId }) =>
    application.get('PublishingService').startAccountBinding(displayName, returnTopicId),
  'publishing.open_account': ({ accountId }) => application.get('PublishingService').openAccount(accountId),
  'publishing.rename_account': ({ accountId, displayName }) =>
    Promise.resolve(application.get('PublishingService').renameAccount(accountId, displayName)),
  'publishing.delete_account': ({ accountId }) => application.get('PublishingService').deleteAccount(accountId),
  'publishing.get_account_status': ({ accountId }) => application.get('PublishingService').getAccountStatus(accountId),
  'publishing.prepare_wechat_draft': ({ accountId, title, markdown, bodyImageFileIds, coverFileId }) =>
    Promise.resolve(
      application.get('PublishingService').prepareWechatDraft({
        accountId,
        title,
        markdown,
        bodyImageFileIds,
        coverFileEntryId: coverFileId
      })
    ),
  'publishing.create_wechat_draft': ({ taskId }) => application.get('PublishingService').createWechatDraft(taskId),
  'publishing.retry_publish_task': ({ taskId }) => application.get('PublishingService').retryPublishTask(taskId),
  'publishing.cancel_publish_task': ({ taskId }) =>
    Promise.resolve(application.get('PublishingService').cancelPublishTask(taskId)),
  'publishing.open_edit_url': ({ taskId }) => application.get('PublishingService').openEditUrl(taskId)
}
