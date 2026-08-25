import type { BrowserWindow } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import { CreatorPlatformPublisher } from '../CreatorPlatformPublisher'

function createXiaohongshuPublisher() {
  return new CreatorPlatformPublisher({
    platform: 'xiaohongshu',
    platformName: '小红书',
    homeUrl: 'https://creator.xiaohongshu.com/',
    authCookieNames: ['web_session'],
    accountNameSelectors: ['[class*="user-name"]']
  })
}

describe('CreatorPlatformPublisher', () => {
  it('recognizes an authenticated creator session from its platform cookie', async () => {
    const getCookies = vi.fn().mockResolvedValue([{ name: 'web_session', value: 'session-token' }])
    const window = {
      webContents: {
        executeJavaScript: vi.fn().mockResolvedValue(undefined),
        session: { cookies: { get: getCookies } }
      }
    } as unknown as BrowserWindow

    await expect(createXiaohongshuPublisher().readLoginState(window)).resolves.toEqual({ loggedIn: true })
    expect(getCookies).toHaveBeenCalledWith({ url: 'https://creator.xiaohongshu.com/' })
  })

  it('uses the visible creator name when the platform exposes one', async () => {
    const window = {
      webContents: {
        executeJavaScript: vi.fn().mockResolvedValue('品牌账号'),
        session: { cookies: { get: vi.fn().mockResolvedValue([{ name: 'web_session', value: 'session-token' }]) } }
      }
    } as unknown as BrowserWindow

    await expect(createXiaohongshuPublisher().readLoginState(window)).resolves.toEqual({
      loggedIn: true,
      accountName: '品牌账号'
    })
  })
})
