import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  PageHeader,
  PageSidePanel,
  PageSidePanelItem,
  PageSidePanelSection,
  Scrollbar
} from '@cherrystudio/ui'
import { useQuery } from '@data/hooks/useDataApi'
import { ipcApi, useIpcOn } from '@renderer/ipc'
import type {
  PublishingAccount,
  PublishingAccountStatus,
  PublishingTask,
  PublishingTaskStatus
} from '@shared/data/types/publishing'
import { CheckCircle2, ExternalLink, Link2, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const EMPTY_ACCOUNTS: readonly PublishingAccount[] = Object.freeze([])
const EMPTY_TASKS: readonly PublishingTask[] = Object.freeze([])

type AccountFilter = 'all' | PublishingAccountStatus

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(status: PublishingAccountStatus, t: (key: string, options?: { defaultValue?: string }) => string) {
  return t('platform_accounts.status.' + status, { defaultValue: status })
}

function taskStatusLabel(
  status: PublishingTaskStatus,
  t: (key: string, options?: { defaultValue?: string }) => string
) {
  return t('platform_accounts.task_status.' + status, { defaultValue: status })
}

function statusBadgeVariant(status: PublishingAccountStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'ready') return 'default'
  if (status === 'expired') return 'destructive'
  return 'secondary'
}

function taskBadgeVariant(status: PublishingTaskStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'created') return 'default'
  if (status === 'failed') return 'destructive'
  if (status === 'cancelled') return 'outline'
  return 'secondary'
}

export default function PlatformAccountsPage() {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState<AccountFilter>('all')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [bindingOpen, setBindingOpen] = useState(false)
  const [bindingName, setBindingName] = useState('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameName, setRenameName] = useState('')
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)

  const {
    data: accountsData,
    isLoading: accountsLoading,
    refetch: refetchAccounts
  } = useQuery('/publishing-accounts', {
    query: { platform: 'wechat', limit: 200 }
  })
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery('/publishing-tasks', {
    query: selectedAccountId ? { accountId: selectedAccountId, limit: 20 } : { limit: 20 },
    enabled: selectedAccountId !== null
  })

  const accounts = accountsData?.items ?? EMPTY_ACCOUNTS
  const tasks = tasksData?.items ?? EMPTY_TASKS
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const deleteAccount = accounts.find((account) => account.id === deleteAccountId)
  const filteredAccounts = useMemo(
    () => (filter === 'all' ? accounts : accounts.filter((account) => account.status === filter)),
    [accounts, filter]
  )

  const refresh = useCallback(() => {
    void refetchAccounts()
    void refetchTasks()
  }, [refetchAccounts, refetchTasks])

  useIpcOn('publishing.account.updated', refresh)
  useIpcOn('publishing.task.updated', refresh)

  const handleStartBinding = async () => {
    const displayName = bindingName.trim()
    if (!displayName) return
    setBusyAccountId('binding')
    try {
      const account = await ipcApi.request('publishing.start_account_binding', { displayName })
      setBindingOpen(false)
      setBindingName('')
      setSelectedAccountId(account.id)
      refresh()
    } finally {
      setBusyAccountId(null)
    }
  }

  const handleOpenAccount = async (accountId: string) => {
    setBusyAccountId(accountId)
    try {
      await ipcApi.request('publishing.open_account', { accountId })
    } finally {
      setBusyAccountId(null)
    }
  }

  const handleRefreshStatus = async (accountId: string) => {
    setBusyAccountId(accountId)
    try {
      await ipcApi.request('publishing.get_account_status', { accountId })
      refresh()
    } finally {
      setBusyAccountId(null)
    }
  }

  const handleRename = async () => {
    if (!selectedAccount) return
    const displayName = renameName.trim()
    if (!displayName) return
    setBusyAccountId(selectedAccount.id)
    try {
      await ipcApi.request('publishing.rename_account', { accountId: selectedAccount.id, displayName })
      setRenameOpen(false)
      refresh()
    } finally {
      setBusyAccountId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteAccountId) return
    setBusyAccountId(deleteAccountId)
    try {
      await ipcApi.request('publishing.delete_account', { accountId: deleteAccountId })
      if (selectedAccountId === deleteAccountId) setSelectedAccountId(null)
      setDeleteAccountId(null)
      refresh()
    } finally {
      setBusyAccountId(null)
    }
  }

  const handleTaskAction = async (task: PublishingTask, action: 'retry' | 'cancel' | 'open') => {
    setBusyTaskId(task.id)
    try {
      if (action === 'retry') await ipcApi.request('publishing.retry_publish_task', { taskId: task.id })
      if (action === 'cancel') await ipcApi.request('publishing.cancel_publish_task', { taskId: task.id })
      if (action === 'open') await ipcApi.request('publishing.open_edit_url', { taskId: task.id })
      refresh()
    } finally {
      setBusyTaskId(null)
    }
  }

  const hasExpired = accounts.some((account) => account.status === 'expired')

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PageHeader
        bordered
        title={t('platform_accounts.title', { defaultValue: 'Platform accounts' })}
        action={
          <Button size="sm" onClick={() => setBindingOpen(true)}>
            <Link2 size={14} />
            {t('platform_accounts.bind', { defaultValue: 'Bind account' })}
          </Button>
        }
      />

      <Scrollbar className="min-h-0 flex-1">
        <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-5 px-5 py-5">
          {hasExpired ? (
            <Alert
              type="warning"
              showIcon
              description={t('platform_accounts.expired_warning', {
                defaultValue: 'One or more accounts need you to sign in again before publishing.'
              })}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-semibold text-foreground text-lg">
                {t('platform_accounts.wechat', { defaultValue: 'WeChat Official Accounts' })}
              </h1>
              <p className="mt-1 text-muted-foreground text-sm">
                {t('platform_accounts.subtitle', {
                  defaultValue: 'Keep each account in its own session and create drafts from Cherry Studio.'
                })}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border-subtle p-1">
              {(['all', 'ready', 'binding', 'expired'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filter === value ? 'secondary' : 'ghost'}
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={() => setFilter(value)}>
                  {t('platform_accounts.filter.' + value, {
                    defaultValue: value === 'all' ? 'All' : statusLabel(value, t)
                  })}
                </Button>
              ))}
            </div>
          </div>

          {accountsLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">{t('common.loading')}</div>
          ) : filteredAccounts.length === 0 ? (
            <EmptyState
              icon={Link2}
              title={t('platform_accounts.empty.title', { defaultValue: 'No platform accounts yet' })}
              description={t('platform_accounts.empty.description', {
                defaultValue: 'Bind a WeChat Official Account to start creating drafts.'
              })}
              actionLabel={t('platform_accounts.bind', { defaultValue: 'Bind account' })}
              onAction={() => setBindingOpen(true)}
            />
          ) : (
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="group flex min-w-0 flex-col gap-4 rounded-lg border border-border-subtle bg-card p-4 transition-colors hover:border-border">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 items-start gap-3 text-left"
                      onClick={() => setSelectedAccountId(account.id)}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Link2 size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{account.displayName}</span>
                        <span className="mt-1 block text-muted-foreground text-xs">
                          {t('platform_accounts.wechat_short', { defaultValue: 'WeChat Official Account' })}
                        </span>
                      </span>
                    </button>
                    <Badge variant={statusBadgeVariant(account.status)}>
                      {account.status === 'ready' ? <CheckCircle2 size={12} /> : null}
                      {statusLabel(account.status, t)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-border-subtle border-t pt-3 text-xs">
                    <span className="truncate text-muted-foreground">
                      {account.lastVerifiedAt
                        ? t('platform_accounts.last_verified', {
                            defaultValue: 'Verified {{date}}',
                            date: formatDate(new Date(account.lastVerifiedAt).toISOString(), i18n.language)
                          })
                        : t('platform_accounts.not_verified', { defaultValue: 'Not verified yet' })}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('platform_accounts.relogin', { defaultValue: 'Sign in again' })}
                        title={t('platform_accounts.relogin', { defaultValue: 'Sign in again' })}
                        loading={busyAccountId === account.id}
                        onClick={() => handleOpenAccount(account.id)}>
                        <RefreshCw size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('platform_accounts.refresh_status', { defaultValue: 'Refresh status' })}
                        title={t('platform_accounts.refresh_status', { defaultValue: 'Refresh status' })}
                        loading={busyAccountId === account.id}
                        onClick={() => handleRefreshStatus(account.id)}>
                        <CheckCircle2 size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('platform_accounts.more', { defaultValue: 'More actions' })}
                        title={t('platform_accounts.more', { defaultValue: 'More actions' })}
                        onClick={() => setSelectedAccountId(account.id)}>
                        <MoreHorizontal size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </Scrollbar>

      <PageSidePanel
        open={selectedAccount !== undefined}
        onClose={() => setSelectedAccountId(null)}
        title={selectedAccount?.displayName}
        closeLabel={t('common.close')}
        footer={
          selectedAccount ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleOpenAccount(selectedAccount.id)}
                loading={busyAccountId === selectedAccount.id}>
                <ExternalLink size={14} />
                {t('platform_accounts.open_backend', { defaultValue: 'Open WeChat backend' })}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRenameName(selectedAccount.displayName)
                  setRenameOpen(true)
                }}>
                {t('platform_accounts.rename', { defaultValue: 'Rename' })}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteAccountId(selectedAccount.id)}>
                <Trash2 size={14} />
                {t('common.delete')}
              </Button>
            </div>
          ) : null
        }>
        {selectedAccount ? (
          <>
            {selectedAccount.status !== 'ready' ? (
              <Alert
                type="warning"
                showIcon
                description={t('platform_accounts.binding_hint', {
                  defaultValue:
                    'Open the WeChat backend and finish sign-in. Cherry Studio will keep this session isolated.'
                })}
              />
            ) : null}
            <PageSidePanelSection title={t('platform_accounts.details', { defaultValue: 'Account details' })}>
              <PageSidePanelItem
                title={t('platform_accounts.platform', { defaultValue: 'Platform' })}
                description={t('platform_accounts.wechat_short', { defaultValue: 'WeChat Official Account' })}
              />
              <PageSidePanelItem
                title={t('platform_accounts.created', { defaultValue: 'Added' })}
                description={formatDate(selectedAccount.createdAt, i18n.language)}
              />
              <PageSidePanelItem
                title={t('platform_accounts.session', { defaultValue: 'Session' })}
                description={t('platform_accounts.session_isolated', { defaultValue: 'Isolated per account' })}
              />
            </PageSidePanelSection>
            <PageSidePanelSection title={t('platform_accounts.recent_tasks', { defaultValue: 'Recent draft tasks' })}>
              {tasksLoading ? (
                <div className="text-muted-foreground text-sm">{t('common.loading')}</div>
              ) : tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t('platform_accounts.no_tasks', { defaultValue: 'No draft tasks for this account.' })}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex min-w-0 items-start justify-between gap-3 rounded-md border border-border-subtle p-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm">{task.title}</div>
                        <div className="mt-1 text-muted-foreground text-xs">
                          {formatDate(task.createdAt, i18n.language)}
                        </div>
                        {task.error ? (
                          <div className="mt-1 break-words text-destructive text-xs">{task.error}</div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge variant={taskBadgeVariant(task.status)}>{taskStatusLabel(task.status, t)}</Badge>
                        <div className="flex items-center gap-1">
                          {task.status === 'created' && task.editUrl ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={t('platform_accounts.open_draft', { defaultValue: 'Open draft' })}
                              title={t('platform_accounts.open_draft', { defaultValue: 'Open draft' })}
                              loading={busyTaskId === task.id}
                              onClick={() => handleTaskAction(task, 'open')}>
                              <ExternalLink size={13} />
                            </Button>
                          ) : null}
                          {task.status === 'failed' && !task.appMsgId ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={t('platform_accounts.retry', { defaultValue: 'Retry' })}
                              title={t('platform_accounts.retry', { defaultValue: 'Retry' })}
                              loading={busyTaskId === task.id}
                              onClick={() => handleTaskAction(task, 'retry')}>
                              <RefreshCw size={13} />
                            </Button>
                          ) : null}
                          {['prepared', 'opening', 'uploading'].includes(task.status) ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={t('platform_accounts.cancel', { defaultValue: 'Cancel' })}
                              title={t('platform_accounts.cancel', { defaultValue: 'Cancel' })}
                              loading={busyTaskId === task.id}
                              onClick={() => handleTaskAction(task, 'cancel')}>
                              <Trash2 size={13} />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PageSidePanelSection>
          </>
        ) : null}
      </PageSidePanel>

      <Dialog open={bindingOpen} onOpenChange={setBindingOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('platform_accounts.bind_dialog.title', { defaultValue: 'Bind WeChat Official Account' })}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <label htmlFor="publishing-account-name" className="font-medium text-sm">
              {t('platform_accounts.account_name', { defaultValue: 'Account name' })}
            </label>
            <Input
              id="publishing-account-name"
              value={bindingName}
              onChange={(event) => setBindingName(event.target.value)}
              placeholder={t('platform_accounts.account_name_placeholder', {
                defaultValue: 'e.g. Brand Official Account'
              })}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleStartBinding()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindingOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleStartBinding()}
              disabled={!bindingName.trim()}
              loading={busyAccountId === 'binding'}>
              {t('platform_accounts.continue', { defaultValue: 'Continue to sign in' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('platform_accounts.rename_dialog.title', { defaultValue: 'Rename account' })}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <label htmlFor="publishing-account-rename" className="font-medium text-sm">
              {t('platform_accounts.account_name', { defaultValue: 'Account name' })}
            </label>
            <Input
              id="publishing-account-rename"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleRename()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleRename()}
              disabled={!renameName.trim()}
              loading={busyAccountId === selectedAccount?.id}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteAccount !== undefined}
        onOpenChange={(open) => !open && setDeleteAccountId(null)}
        title={t('platform_accounts.delete_dialog.title', { defaultValue: 'Delete this account?' })}
        description={t('platform_accounts.delete_dialog.description', {
          defaultValue: 'This removes the account row and clears its isolated sign-in session.'
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        destructive
        confirmLoading={busyAccountId === deleteAccountId}
        onConfirm={() => handleDelete()}
      />
    </div>
  )
}
