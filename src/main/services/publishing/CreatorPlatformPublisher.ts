import type { PublishingPlatform } from '@shared/data/types/publishing'
import type { BrowserWindow } from 'electron'

import type { PlatformDraftResult, PlatformLoginState, PlatformPublisher } from './PlatformPublisher'

type CreatorPlatform = Exclude<PublishingPlatform, 'wechat'>

interface CreatorPlatformPublisherOptions {
  platform: CreatorPlatform
  platformName: string
  homeUrl: string
  authCookieNames: string[]
  accountNameSelectors: string[]
}

/** Maintains an isolated creator-platform login session without automated draft creation. */
export class CreatorPlatformPublisher implements PlatformPublisher {
  readonly platform: CreatorPlatform
  readonly platformName: string
  readonly homeUrl: string
  readonly supportsDrafts = false
  private readonly authCookieNames: string[]
  private readonly accountNameSelectors: string[]

  constructor(options: CreatorPlatformPublisherOptions) {
    this.platform = options.platform
    this.platformName = options.platformName
    this.homeUrl = options.homeUrl
    this.authCookieNames = options.authCookieNames
    this.accountNameSelectors = options.accountNameSelectors
  }

  getWindowTitle(displayName: string): string {
    return displayName === this.platformName ? displayName : `${displayName} · ${this.platformName}`
  }

  async readLoginState(window: BrowserWindow): Promise<PlatformLoginState> {
    const selectors = JSON.stringify(this.accountNameSelectors)
    const accountName = await window.webContents.executeJavaScript(
      `(() => {
        const ignoredNames = new Set(['登录', '登入', 'Log in', 'Sign in'])
        for (const selector of ${selectors}) {
          const element = document.querySelector(selector)
          const value = element instanceof HTMLImageElement ? element.alt : element?.textContent
          const name = value?.trim()
          if (name && name.length <= 80 && !ignoredNames.has(name)) return name
        }
        return undefined
      })()`,
      true
    )
    const cookies = await window.webContents.session.cookies.get({ url: this.homeUrl })
    const loggedIn = cookies.some((cookie) => this.authCookieNames.includes(cookie.name) && cookie.value.length > 0)

    return {
      loggedIn,
      ...(loggedIn && typeof accountName === 'string' && accountName ? { accountName } : {})
    }
  }

  createDraft(): Promise<PlatformDraftResult> {
    return Promise.reject(new Error(`${this.platformName}暂不支持自动创建草稿`))
  }
}
