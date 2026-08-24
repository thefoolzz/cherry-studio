import type { BrowserWindow } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import { WechatPublisher } from '../WechatPublisher'

describe('WechatPublisher.renderMarkdown', () => {
  it('renders Markdown while escaping raw HTML and preserving links', () => {
    const html = new WechatPublisher().renderMarkdown('<script>alert(1)</script>\n\n[Docs](https://example.com)')

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('<a href="https://example.com"')
  })

  it('converts single line breaks into HTML breaks for editor readability', () => {
    const html = new WechatPublisher().renderMarkdown('第一行\n第二行')

    expect(html).toContain('第一行<br>\n第二行')
  })

  it('keeps generated image attachment ids in the rendered article', () => {
    const html = new WechatPublisher().renderMarkdown('![封面](attachment://image-1)')

    expect(html).toContain('<img src="attachment://image-1" alt="封面"')
    expect(html).toContain('<figcaption')
    expect(html).not.toContain('<p style=')
  })

  it('removes the duplicate title and pre-publish checklist from the platform body', () => {
    const html = new WechatPublisher().renderMarkdown(`
# 秋日手冲体验

从一杯咖啡开始认识风味。

## 发布前检查

- 活动日期
`)

    expect(html).not.toContain('秋日手冲体验')
    expect(html).not.toContain('发布前检查')
    expect(html).not.toContain('活动日期')
    expect(html).toContain('font-size:16px')
  })
})

describe('WechatPublisher.createDraft', () => {
  it('uses the authenticated WeChat draft API and opens the returned editor', async () => {
    const executeJavaScript = vi.fn().mockResolvedValue({
      appMsgId: 'draft-1',
      editUrl: 'https://mp.weixin.qq.com/cgi-bin/appmsg?action=edit&appmsgid=draft-1'
    })
    const loadURL = vi.fn().mockResolvedValue(undefined)
    const window = {
      isDestroyed: () => false,
      loadURL,
      webContents: {
        executeJavaScript,
        getURL: () => 'https://mp.weixin.qq.com/cgi-bin/home?token=123',
        isCrashed: () => false
      }
    } as unknown as BrowserWindow

    const result = await new WechatPublisher().createDraft(window, {
      taskId: 'task-1',
      title: '测试草稿',
      markdown: '# 正文',
      images: []
    })

    expect(executeJavaScript.mock.calls[0][0]).toContain('operate_appmsg')
    expect(loadURL).toHaveBeenCalledWith(result.editUrl)
    expect(result.remoteDraftId).toBe('draft-1')
  })
})
