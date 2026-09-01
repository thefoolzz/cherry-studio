import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  RadioGroup,
  RadioGroupItem
} from '@cherrystudio/ui'
import { useQuery } from '@data/hooks/useDataApi'
import { loggerService } from '@logger'
import { ipcApi } from '@renderer/ipc'
import { openRoute } from '@renderer/services/mainWindowNavigation'
import { toast } from '@renderer/services/toast'
import type { PublishingAccount } from '@shared/data/types/publishing'
import { parsePublishingContentDraft } from '@shared/utils/publishing'
import { BookmarkPlus, CircleAlert, PencilLine, Send } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type PublishingArticleDraft, PublishingArticleEditorDialog } from './PublishingArticleEditorDialog'

const logger = loggerService.withContext('PublishingDraftAction')
const EMPTY_ACCOUNTS: readonly PublishingAccount[] = Object.freeze([])

function extractArticleTitle(markdown: string, fallback: string, defaultTitle: string): string {
  const heading = markdown.match(/^\s{0,3}#\s+(.+?)\s*$/m)?.[1]
  if (heading?.trim()) return heading.replace(/[*_`]/g, '').trim().slice(0, 120)

  const firstLine = markdown
    .split('\n')
    .map((line) => line.replace(/^\s{0,3}#+\s*/, '').trim())
    .find(Boolean)
  return (firstLine || fallback || defaultTitle).slice(0, 120)
}

interface PublishingDraftActionProps {
  markdown: string
  topicName: string
  imageFileIds?: string[]
  onCreateTemplate: () => Promise<void>
  onSaveDraft: (draft: PublishingArticleDraft) => Promise<void>
}

export function PublishingDraftAction({
  markdown,
  topicName,
  imageFileIds = [],
  onCreateTemplate,
  onSaveDraft
}: PublishingDraftActionProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [publishedSource, setPublishedSource] = useState<string | null>(null)
  const [savedDraft, setSavedDraft] = useState<{ source: string; draft: PublishingArticleDraft } | null>(null)
  const [editingDraft, setEditingDraft] = useState<PublishingArticleDraft | null>(null)
  const { data, isLoading } = useQuery('/publishing-accounts', {
    query: { platform: 'wechat', status: 'ready', limit: 200 }
  })
  const contentDraft = useMemo(() => parsePublishingContentDraft(markdown), [markdown])
  const initialArticleDraft = useMemo<PublishingArticleDraft>(
    () => ({
      title:
        contentDraft.title ?? extractArticleTitle(contentDraft.markdown, topicName, t('chat.publishing.default_title')),
      markdown: contentDraft.markdown
    }),
    [contentDraft, t, topicName]
  )
  const articleDraft = savedDraft?.source === markdown ? savedDraft.draft : initialArticleDraft
  const accounts = data?.items ?? EMPTY_ACCOUNTS
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  )

  const handleOpen = useCallback(() => {
    setTitle(articleDraft.title)
    setSelectedAccountId(accounts[0]?.id ?? '')
    setOpen(true)
  }, [accounts, articleDraft.title])

  const handlePublish = useCallback(async () => {
    if (!selectedAccount || !title.trim()) return

    setBusy(true)
    try {
      const prepared = await ipcApi.request('publishing.prepare_draft', {
        accountId: selectedAccount.id,
        title: title.trim(),
        markdown: articleDraft.markdown,
        ...(imageFileIds.length > 0 ? { bodyImageFileIds: imageFileIds } : {})
      })
      const task = await ipcApi.request('publishing.create_draft', { taskId: prepared.id })
      if (task.status !== 'created') {
        throw new Error(task.error ?? t('chat.publishing.failed'))
      }

      setPublishedSource(markdown)
      setOpen(false)
      toast.success(t('chat.publishing.success'))
    } catch (error) {
      logger.error('Failed to create WeChat draft', error as Error)
      toast.error(error instanceof Error ? error.message : t('chat.publishing.failed'))
    } finally {
      setBusy(false)
    }
  }, [articleDraft.markdown, imageFileIds, markdown, selectedAccount, title, t])

  const handleCreateTemplate = useCallback(async () => {
    setTemplateBusy(true)
    try {
      await onCreateTemplate()
    } catch (error) {
      logger.error('Failed to start writing-template creation', error as Error)
      toast.error(error instanceof Error ? error.message : t('message.error.operation_unavailable'))
    } finally {
      setTemplateBusy(false)
    }
  }, [onCreateTemplate, t])

  if (publishedSource === markdown || contentDraft.markdown.length < 20) return null

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-border-subtle border-t pt-3">
        <Button variant="outline" size="sm" onClick={() => setEditingDraft(articleDraft)}>
          <PencilLine size={14} />
          {t('common.edit')}
        </Button>
        <Button variant="outline" size="sm" loading={templateBusy} onClick={() => void handleCreateTemplate()}>
          <BookmarkPlus size={14} />
          {t('chat.publishing.save_template')}
        </Button>
        <Button size="sm" onClick={handleOpen} disabled={isLoading}>
          <Send size={14} />
          {t('chat.publishing.confirm')}
        </Button>
        <span className="text-muted-foreground text-xs">{t('chat.publishing.hint')}</span>
      </div>

      {editingDraft && (
        <PublishingArticleEditorDialog
          draft={editingDraft}
          onCancel={() => setEditingDraft(null)}
          onSave={async (draft) => {
            try {
              await onSaveDraft(draft)
              setSavedDraft({ source: markdown, draft })
              setEditingDraft(null)
            } catch (error) {
              logger.error('Failed to save publishing article edits', error as Error)
              toast.error(error instanceof Error ? error.message : t('message.error.operation_unavailable'))
            }
          }}
        />
      )}

      <Dialog open={open} onOpenChange={(nextOpen) => !busy && setOpen(nextOpen)}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('chat.publishing.dialog.title')}</DialogTitle>
            <DialogDescription>{t('chat.publishing.dialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="publishing-draft-title" className="font-medium text-sm">
                {t('chat.publishing.dialog.article_title')}
              </label>
              <Input id="publishing-draft-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>

            <div className="grid gap-2">
              <span className="font-medium text-sm">{t('chat.publishing.dialog.account')}</span>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
              ) : accounts.length === 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2.5">
                  <span className="text-muted-foreground text-sm">{t('chat.publishing.dialog.no_accounts')}</span>
                  <Button size="sm" variant="outline" onClick={() => openRoute('/platform-accounts')}>
                    {t('chat.publishing.dialog.bind_account')}
                  </Button>
                </div>
              ) : (
                <RadioGroup
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                  className="max-h-48 overflow-y-auto rounded-lg border border-border-subtle p-2">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      htmlFor={`publishing-account-${account.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent/50">
                      <RadioGroupItem id={`publishing-account-${account.id}`} value={account.id} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{account.displayName}</span>
                        <span className="block text-muted-foreground text-xs">
                          {t('platform_accounts.wechat', { defaultValue: '微信公众号' })}
                        </span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>

            {contentDraft.pendingFacts.length > 0 && (
              <div className="grid gap-2 border-warning-border border-l-2 pl-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <CircleAlert aria-hidden className="size-4 shrink-0 text-warning" />
                  <span>{t('chat.publishing.dialog.pending_facts', { count: contentDraft.pendingFacts.length })}</span>
                </div>
                <p className="text-muted-foreground text-xs">{t('chat.publishing.dialog.pending_facts_description')}</p>
                <ul className="grid gap-1 pl-5 text-sm">
                  {contentDraft.pendingFacts.map((fact) => (
                    <li key={fact} className="list-disc">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handlePublish()} disabled={!selectedAccount || !title.trim()} loading={busy}>
              {t('chat.publishing.dialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
