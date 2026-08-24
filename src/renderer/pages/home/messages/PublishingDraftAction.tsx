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
import { Send } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const logger = loggerService.withContext('PublishingDraftAction')
const EMPTY_ACCOUNTS: readonly PublishingAccount[] = Object.freeze([])

function extractArticleTitle(markdown: string, fallback: string, defaultTitle: string): string {
  const heading = markdown.match(/^\s{0,3}#\s+(.+?)\s*$/m)?.[1]
  if (heading?.trim()) return heading.replace(/[\*_`]/g, '').trim().slice(0, 120)

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
}

function normalizePublishingMarkdown(markdown: string): string {
  const fenced = markdown.match(/```(?:markdown|md)\s*\n([\s\S]*?)\n```/i)?.[1]
  return (fenced ?? markdown).trim()
}

export function PublishingDraftAction({ markdown, topicName, imageFileIds = [] }: PublishingDraftActionProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(false)
  const { data, isLoading } = useQuery('/publishing-accounts', {
    query: { platform: 'wechat', status: 'ready', limit: 200 }
  })
  const accounts = data?.items ?? EMPTY_ACCOUNTS
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  )

  const handleOpen = useCallback(() => {
    setTitle(extractArticleTitle(normalizePublishingMarkdown(markdown), topicName, t('chat.publishing.default_title')))
    setSelectedAccountId(accounts[0]?.id ?? '')
    setOpen(true)
  }, [accounts, markdown, t, topicName])

  const handlePublish = useCallback(async () => {
    if (!selectedAccount || !title.trim()) return

    setBusy(true)
    try {
      const prepared = await ipcApi.request('publishing.prepare_wechat_draft', {
        accountId: selectedAccount.id,
        title: title.trim(),
        markdown: normalizePublishingMarkdown(markdown),
        ...(imageFileIds.length > 0 ? { bodyImageFileIds: imageFileIds } : {})
      })
      const task = await ipcApi.request('publishing.create_wechat_draft', { taskId: prepared.id })
      if (task.status !== 'created') {
        throw new Error(task.error ?? t('chat.publishing.failed'))
      }

      setPublished(true)
      setOpen(false)
      toast.success(t('chat.publishing.success'))
    } catch (error) {
      logger.error('Failed to create WeChat draft', error as Error)
      toast.error(error instanceof Error ? error.message : t('chat.publishing.failed'))
    } finally {
      setBusy(false)
    }
  }, [imageFileIds, markdown, selectedAccount, title, t])

  if (published || markdown.trim().length < 20) return null

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-border-subtle border-t pt-3">
        <Button size="sm" onClick={handleOpen} disabled={isLoading}>
          <Send size={14} />
          {t('chat.publishing.confirm')}
        </Button>
        <span className="text-muted-foreground text-xs">{t('chat.publishing.hint')}</span>
      </div>

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
