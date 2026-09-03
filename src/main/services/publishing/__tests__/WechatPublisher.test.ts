import type { BrowserWindow } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import { WechatPublisher } from '../WechatPublisher'

describe('WechatPublisher.renderMarkdown', () => {
  it('renders Markdown while escaping raw HTML and preserving links', () => {
    const html = new WechatPublisher().renderMarkdown('<script>alert(1)</script>\n\n[Docs](https://example.com)')

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('<a href="https://example.com"')
  })

  it('resolves a soft line break the way the conversation renders it', () => {
    const publisher = new WechatPublisher()

    // A `<br>` here would turn a soft-wrapped paragraph into separate lines that
    // the conversation never showed.
    expect(publisher.renderMarkdown('第一行\n第二行')).toContain('第一行第二行')
    expect(publisher.renderMarkdown('first line\nsecond line')).toContain('first line second line')
    expect(publisher.renderMarkdown('第一行  \n第二行')).toContain('第一行<br>')
  })

  it('keeps generated image attachment ids in the rendered article', () => {
    const html = new WechatPublisher().renderMarkdown('![封面](attachment://image-1)')

    expect(html).toContain('<img src="attachment://image-1" alt="封面"')
    expect(html).not.toContain('<p style=')
  })

  it('renders a tight list as one styled item per entry', () => {
    const html = new WechatPublisher().renderMarkdown('# 指南\n\n- 第一问\n- 第二问\n- 第三问')

    // A `<p>` inside `<li>` makes the WeChat editor split each entry into a
    // filled item plus an empty one, which is how blank bullets appear.
    expect(html).not.toMatch(/<li[^>]*><p/)
    expect(html.match(/<li /g)).toHaveLength(3)
    expect(html).toContain('第一问</li>')
  })

  it('keeps token attributes the styling must not overwrite', () => {
    const ordered = new WechatPublisher().renderMarkdown('# 指南\n\n3. 第三步\n4. 第四步')
    const table = new WechatPublisher().renderMarkdown('# 指南\n\n| 车型 | 日租 |\n| :--- | ---: |\n| 七座 | 150 |')

    expect(ordered).toContain('start="3"')
    expect(table).toContain('border-collapse:collapse')
    expect(table).toContain('text-align:right')
  })

  it('gives every heading level its own size instead of collapsing to h2', () => {
    const html = new WechatPublisher().renderMarkdown('# 指南\n\n## 二级\n\n#### 四级')

    expect(html).toMatch(/<h4 style="[^"]*font-size:16px/)
    expect(html).toMatch(/<h2 style="[^"]*font-size:20px/)
  })

  it('styles code so the WeChat editor keeps it monospaced', () => {
    const html = new WechatPublisher().renderMarkdown('# 指南\n\n用 `pnpm dev` 启动。\n\n```sh\npnpm build\n```')

    expect(html).toMatch(/<pre style="[^"]*background:#f7f7f7/)
    expect(html).toMatch(/<code style="[^"]*monospace[^"]*">pnpm dev<\/code>/)
  })

  it('drops the assistant citation markers instead of publishing them as text', () => {
    const html = new WechatPublisher().renderMarkdown('# 指南\n\n内容更有机会进入引用范围。[cite:889902ca-1]')

    expect(html).not.toContain('cite:')
    expect(html).toContain('内容更有机会进入引用范围。')
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

  it('removes assistant planning text before the article from the platform body', () => {
    const html = new WechatPublisher().renderMarkdown(`
我会先分析读者，再生成配图和正文。

# 海南自驾租赁指南

这是平台应该收到的正式正文。
`)

    expect(html).not.toContain('我会先分析读者')
    expect(html).not.toContain('海南自驾租赁指南')
    expect(html).toContain('这是平台应该收到的正式正文')
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
