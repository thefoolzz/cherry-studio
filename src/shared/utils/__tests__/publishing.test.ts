import { describe, expect, it } from 'vitest'

import { parsePublishingContentDraft } from '../publishing'

describe('parsePublishingContentDraft', () => {
  it('separates the title, article body, and pre-publish checklist', () => {
    const draft = parsePublishingContentDraft(`
# 把秋天冲进杯子里

从一杯手冲开始，认识风味的变化。

## 发布前检查

- 活动日期与时间
- 报名联系方式
`)

    expect(draft).toEqual({
      title: '把秋天冲进杯子里',
      markdown: '从一杯手冲开始，认识风味的变化。',
      pendingFacts: ['活动日期与时间', '报名联系方式']
    })
  })

  it('unwraps fenced Markdown and detects legacy inline placeholders', () => {
    const draft = parsePublishingContentDraft(`\`\`\`markdown
# 活动招募

活动时间：[待补充：具体日期]
\`\`\``)

    expect(draft.title).toBe('活动招募')
    expect(draft.markdown).toBe('')
    expect(draft.pendingFacts).toEqual(['具体日期'])
  })

  it('keeps the pre-publish checklist compact', () => {
    const draft = parsePublishingContentDraft(`
# 活动招募

正文

## 发布前检查
- 时间
- 地点
- 价格
- 联系方式
- 退款规则
`)

    expect(draft.pendingFacts).toEqual(['时间', '地点', '价格', '联系方式'])
  })

  it('drops assistant planning text before the article title', () => {
    const draft = parsePublishingContentDraft(`
我先分析目标读者，再生成配图和正文。

正在整理文章结构。

# 海南自驾租赁指南

这是平台应该收到的正式正文。
`)

    expect(draft).toEqual({
      title: '海南自驾租赁指南',
      markdown: '这是平台应该收到的正式正文。',
      pendingFacts: []
    })
  })

  it.each([
    ['single id', '[cite:889902ca-1]'],
    ['chained ids', '[cite:889902ca-1][cite:889902ca-2]'],
    ['comma list', '[cite: 889902ca-1, 889902ca-2]'],
    ['unresolvable empty marker', '[cite:]']
  ])('strips the assistant citation marker (%s) the platform cannot resolve', (_name, marker) => {
    const draft = parsePublishingContentDraft(`# 指南\n\n内容更有机会进入引用范围。${marker}\n\n下一段。`)

    expect(draft.markdown).toBe('内容更有机会进入引用范围。\n\n下一段。')
  })

  it('leaves a citation marker inside a code sample intact', () => {
    const draft = parsePublishingContentDraft('# 指南\n\n用 `[cite:id]` 标注来源。')

    expect(draft.markdown).toBe('用 `[cite:id]` 标注来源。')
  })
})
