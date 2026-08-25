import { randomUUID } from 'node:crypto'

import { application } from '@application'
import { fileEntryService } from '@data/services/FileEntryService'
import { publishingDataService } from '@data/services/PublishingDataService'
import { loggerService } from '@logger'
import { BaseService, DependsOn, Injectable, Phase, ServicePhase } from '@main/core/lifecycle'
import { WindowType } from '@main/core/window/types'
import type { CreatePublishingTaskDto, UpdatePublishingTaskDto } from '@shared/data/api/schemas/publishing'
import type { PublishingAccount, PublishingPlatform, PublishingTask } from '@shared/data/types/publishing'
import type { BrowserWindow } from 'electron'
import { session } from 'electron'

import { CreatorPlatformPublisher } from './CreatorPlatformPublisher'
import type { PlatformPublisher } from './PlatformPublisher'
import { WechatPublisher } from './WechatPublisher'

const logger = loggerService.withContext('PublishingService')

type AccountWindow = {
  accountId: string
  windowId: string
}

const DEFAULT_ACCOUNT_NAMES: Record<PublishingPlatform, string> = {
  wechat: '微信公众号',
  douyin: '抖音',
  xiaohongshu: '小红书',
  zhihu: '知乎'
}

/**
 * Owns desktop session state and side effects for platform publishing.
 * Persisted rows are deliberately delegated to PublishingDataService.
 */
@Injectable('PublishingService')
@DependsOn(['WindowManager'])
@ServicePhase(Phase.WhenReady)
export class PublishingService extends BaseService {
  private readonly publishers: Record<PublishingPlatform, PlatformPublisher> = {
    wechat: new WechatPublisher(),
    douyin: new CreatorPlatformPublisher({
      platform: 'douyin',
      platformName: '抖音',
      homeUrl: 'https://creator.douyin.com/',
      authCookieNames: ['sessionid', 'sessionid_ss', 'sid_guard'],
      accountNameSelectors: ['[class*="user-name"]', '[class*="userName"]', '[class*="nickname"]']
    }),
    xiaohongshu: new CreatorPlatformPublisher({
      platform: 'xiaohongshu',
      platformName: '小红书',
      homeUrl: 'https://creator.xiaohongshu.com/',
      authCookieNames: ['web_session'],
      accountNameSelectors: ['[class*="user-name"]', '[class*="userName"]', '[class*="nickname"]']
    }),
    zhihu: new CreatorPlatformPublisher({
      platform: 'zhihu',
      platformName: '知乎',
      homeUrl: 'https://www.zhihu.com/creator',
      authCookieNames: ['z_c0'],
      accountNameSelectors: ['.AppHeader-profile .Avatar', '[class*="ProfileCard"] [class*="name"]']
    })
  }
  private readonly windows = new Map<string, AccountWindow>()
  private readonly accountByWindowId = new Map<string, string>()
  private readonly inFlightTasks = new Map<string, Promise<PublishingTask>>()

  protected override onInit(): void {
    const wm = application.get('WindowManager')
    this.registerDisposable(
      wm.onWindowCreatedByType(WindowType.PublishingAccount, ({ id, window }) => {
        window.webContents.on('did-finish-load', () => {
          void this.refreshWindowAccount(window)
        })
        window.webContents.on('did-navigate', () => {
          void this.refreshWindowAccount(window)
        })
        window.once('closed', () => {
          const accountId = this.accountByWindowId.get(id)
          if (!accountId) return
          this.accountByWindowId.delete(id)
          this.windows.delete(accountId)
        })
      })
    )
    this.registerDisposable(
      wm.onWindowDestroyedByType(WindowType.PublishingAccount, ({ id }) => {
        const accountId = this.accountByWindowId.get(id)
        if (!accountId) return
        this.accountByWindowId.delete(id)
        this.windows.delete(accountId)
      })
    )
  }

  listAccounts(): PublishingAccount[] {
    return publishingDataService.listAccounts({ limit: 200 }).items
  }

  getPublishTask(taskId: string): PublishingTask {
    return publishingDataService.getTask(taskId)
  }

  listPublishTasks(accountId?: string): PublishingTask[] {
    return publishingDataService.listTasks({ accountId, limit: 200 }).items
  }

  async startAccountBinding(platform: PublishingPlatform, returnTopicId?: string): Promise<PublishingAccount> {
    const id = randomUUID()
    const account = publishingDataService.createAccount(
      {
        platform,
        displayName: DEFAULT_ACCOUNT_NAMES[platform],
        partition: `persist:post-studio-${platform}-${id}`
      },
      id
    )
    this.broadcastAccount(account)
    void returnTopicId
    await this.openAccountWindow(account)
    return account
  }

  async openAccount(accountId: string): Promise<void> {
    const account = publishingDataService.getAccount(accountId)
    await this.openAccountWindow(account)
  }

  renameAccount(accountId: string, displayName: string): PublishingAccount {
    const account = publishingDataService.updateAccount(accountId, { displayName })
    this.broadcastAccount(account)
    return account
  }

  async deleteAccount(accountId: string): Promise<void> {
    const account = publishingDataService.getAccount(accountId)
    const existing = this.windows.get(accountId)
    if (existing) {
      application.get('WindowManager').close(existing.windowId)
      this.windows.delete(accountId)
      this.accountByWindowId.delete(existing.windowId)
    }

    // Session data is the only place credentials live. Clear it before removing
    // the row so a failed DB write cannot silently orphan an active session.
    const accountSession = session.fromPartition(account.partition)
    await accountSession.clearStorageData()
    await accountSession.clearCache().catch(() => undefined)
    publishingDataService.deleteAccount(accountId)
    this.broadcastAccount(account, true)
  }

  async getAccountStatus(accountId: string): Promise<PublishingAccount> {
    const account = publishingDataService.getAccount(accountId)
    const window = this.getAccountWindow(accountId)
    if (!window || window.isDestroyed()) return account
    return this.refreshAccountFromWindow(account, window)
  }

  prepareDraft(
    input: Omit<CreatePublishingTaskDto, 'imageFileEntryIds'> & { bodyImageFileIds?: string[] }
  ): PublishingTask {
    const account = publishingDataService.getAccount(input.accountId)
    if (!this.publishers[account.platform].supportsDrafts) {
      throw new Error('该平台暂不支持自动创建草稿')
    }
    if (account.status !== 'ready') {
      throw new Error('请先完成平台账号绑定')
    }
    const task = publishingDataService.createTask({
      accountId: input.accountId,
      title: input.title,
      markdown: input.markdown,
      imageFileEntryIds: input.bodyImageFileIds ?? [],
      coverFileEntryId: input.coverFileEntryId
    })
    this.broadcastTask(task)
    return task
  }

  async createDraft(taskId: string): Promise<PublishingTask> {
    const current = publishingDataService.getTask(taskId)
    if (current.status === 'created' && current.remoteDraftId) return current
    if (current.status === 'cancelled') throw new Error('任务已取消')

    const existing = this.inFlightTasks.get(taskId)
    if (existing) return existing

    const operation = this.createDraftInternal(current)
    this.inFlightTasks.set(taskId, operation)
    try {
      return await operation
    } finally {
      this.inFlightTasks.delete(taskId)
    }
  }

  async retryPublishTask(taskId: string): Promise<PublishingTask> {
    const task = publishingDataService.getTask(taskId)
    if (task.status !== 'failed' || task.remoteDraftId) {
      throw new Error('只有未创建草稿的失败任务可以重试')
    }
    const reset = publishingDataService.updateTask(taskId, { status: 'prepared', error: null })
    this.broadcastTask(reset)
    return this.createDraft(taskId)
  }

  cancelPublishTask(taskId: string): PublishingTask {
    const task = publishingDataService.getTask(taskId)
    if (!['prepared', 'opening', 'uploading'].includes(task.status)) {
      throw new Error('当前任务已经开始创建，无法取消')
    }
    const cancelled = publishingDataService.updateTask(taskId, { status: 'cancelled' })
    this.broadcastTask(cancelled)
    return cancelled
  }

  async openEditUrl(taskId: string): Promise<void> {
    const task = publishingDataService.getTask(taskId)
    if (!task.editUrl) throw new Error('任务尚未生成编辑地址')
    const account = publishingDataService.getAccount(task.accountId)
    const window = await this.openAccountWindow(account)
    await window.loadURL(task.editUrl)
    if (!window.isVisible()) window.show()
    window.focus()
  }

  updateTask(taskId: string, changes: UpdatePublishingTaskDto): PublishingTask {
    const task = publishingDataService.updateTask(taskId, changes)
    this.broadcastTask(task)
    return task
  }

  private async createDraftInternal(task: PublishingTask): Promise<PublishingTask> {
    const account = publishingDataService.getAccount(task.accountId)
    const publisher = this.publishers[account.platform]
    let current = this.transitionTask(task.id, 'opening', null)
    try {
      const window = await this.openAccountWindow(account)
      const verified = await this.refreshAccountFromWindow(account, window)
      if (verified.status !== 'ready') {
        throw new Error('账号登录状态已过期，请重新登录')
      }

      const latest = publishingDataService.getTask(task.id)
      if (latest.status === 'cancelled') return latest

      current = this.transitionTask(task.id, 'uploading', null)
      const fileManager = application.get('FileManager')
      const images = await Promise.all(
        task.imageFileEntryIds.map(async (id) => {
          const entry = fileEntryService.getById(id)
          const file = await fileManager.read(id, { encoding: 'base64' })
          const name =
            entry.ext && !entry.name.toLowerCase().endsWith(`.${entry.ext}`) ? `${entry.name}.${entry.ext}` : entry.name
          return { id, name, mime: file.mime, content: file.content }
        })
      )
      current = this.transitionTask(task.id, 'creating', null)
      const result = await publisher.createDraft(window, {
        taskId: task.id,
        title: task.title,
        markdown: task.markdown,
        images
      })
      current = publishingDataService.updateTask(task.id, {
        status: 'created',
        remoteDraftId: result.remoteDraftId,
        editUrl: result.editUrl,
        error: null
      })
      this.broadcastTask(current)
      return current
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const failed = publishingDataService.updateTask(task.id, { status: 'failed', error: message })
      this.broadcastTask(failed)
      logger.warn('Draft creation failed', { taskId: task.id, platform: account.platform, error: message })
      return failed
    }
  }

  private transitionTask(taskId: string, status: PublishingTask['status'], error: string | null): PublishingTask {
    const task = publishingDataService.updateTask(taskId, { status, ...(error === null ? { error: null } : { error }) })
    this.broadcastTask(task)
    return task
  }

  private async openAccountWindow(account: PublishingAccount): Promise<BrowserWindow> {
    const publisher = this.publishers[account.platform]
    const existing = this.getAccountWindow(account.id)
    if (existing && !existing.isDestroyed()) {
      if (!existing.isVisible()) existing.show()
      existing.focus()
      return existing
    }

    const wm = application.get('WindowManager')
    const windowId = wm.open(WindowType.PublishingAccount, {
      options: {
        title: publisher.getWindowTitle(account.displayName),
        webPreferences: { partition: account.partition }
      }
    })
    const window = wm.getWindow(windowId)
    if (!window) throw new Error('无法打开平台登录窗口')
    this.windows.set(account.id, { accountId: account.id, windowId })
    this.accountByWindowId.set(windowId, account.id)
    await window.loadURL(publisher.homeUrl)
    if (!window.isVisible()) window.show()
    window.focus()
    return window
  }

  private getAccountWindow(accountId: string): BrowserWindow | undefined {
    const state = this.windows.get(accountId)
    return state ? application.get('WindowManager').getWindow(state.windowId) : undefined
  }

  private async refreshWindowAccount(window: BrowserWindow): Promise<void> {
    const windowId = application.get('WindowManager').getWindowId(window)
    if (!windowId) return
    const accountId = this.accountByWindowId.get(windowId)
    if (!accountId) return
    try {
      const account = publishingDataService.getAccount(accountId)
      await this.refreshAccountFromWindow(account, window)
    } catch (error) {
      logger.debug('Unable to refresh publishing account state', { accountId, error })
    }
  }

  private async refreshAccountFromWindow(
    account: PublishingAccount,
    window: BrowserWindow
  ): Promise<PublishingAccount> {
    const state = await this.publishers[account.platform].readLoginState(window)
    const nextStatus = state.loggedIn ? 'ready' : account.status === 'binding' ? 'binding' : 'expired'
    const next = publishingDataService.updateAccount(account.id, {
      ...(state.loggedIn && state.accountName && state.accountName !== account.displayName
        ? { displayName: state.accountName }
        : {}),
      status: nextStatus,
      lastVerifiedAt: state.loggedIn ? Date.now() : null
    })
    this.broadcastAccount(next)
    return next
  }

  private broadcastAccount(account: PublishingAccount, deleted = false): void {
    application.get('IpcApiService').broadcast('publishing.account.updated', { account, deleted })
  }

  private broadcastTask(task: PublishingTask): void {
    application.get('IpcApiService').broadcast('publishing.task.updated', task)
  }
}
