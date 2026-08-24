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
})
