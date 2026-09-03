import { parsePublishingContentDraft } from '@shared/utils/publishing'
import { describe, expect, it } from 'vitest'

import { measureArticle } from '../articleMetrics'

describe('measureArticle', () => {
  it('counts the prose that actually ships, not the title, checklist or Markdown syntax', () => {
    const metrics = measureArticle(`# 十二个字的标题在这里

**加粗**的正文一共十个字。

## 发布前检查

- 活动日期
`)

    // 加粗的正文一共十个字。 = 11 characters counting the period, the way a
    // platform word counter does; emphasis markers, the title and the checklist
    // are not part of what the reader sees.
    expect(metrics.characterCount).toBe(11)
    expect(metrics.pendingFacts).toEqual(['活动日期'])
  })

  it('reports the character delta against the target the user asked for', () => {
    const under = measureArticle('# 标题\n\n六个字正文啊', 10)
    const over = measureArticle('# 标题\n\n六个字正文啊', 4)

    expect(under.deltaFromTarget).toBe(-4)
    expect(over.deltaFromTarget).toBe(2)
  })

  it('omits the target fields when the user named no length', () => {
    expect(measureArticle('# 标题\n\n正文内容')).not.toHaveProperty('deltaFromTarget')
  })

  it('reports placeholder lines that publishing deletes whole', () => {
    const source = '# 标题\n\n活动时间是[待补充：具体日期]，请留意。\n\n第二段正文。'
    const metrics = measureArticle(source)

    expect(metrics.droppedPlaceholderLines).toEqual(['活动时间是[待补充：具体日期]，请留意。'])
    // The sentence is gone from the published body, not just the placeholder.
    expect(parsePublishingContentDraft(source).markdown).not.toContain('请留意')
  })

  it('counts the AI cadences the prompt caps and ignores the ones absent', () => {
    const metrics = measureArticle(`# 标题

这不是简单的调整，而是一次重构。真正的问题在别处。

综上所述，真正的答案只有一个。
`)

    expect(metrics.aiTone.cadences).toEqual({ '不是……而是……': 1, '真正的……': 2, '综上所述/总而言之': 1 })
  })

  it('flags paragraph openings that repeat', () => {
    const metrics = measureArticle(`# 标题

汽车租赁公司需要补全车型页面。

汽车租赁公司需要补全门店页面。

搜索方式已经变了。
`)

    expect(metrics.repeatedParagraphOpenings).toEqual(['汽车租赁公司'])
    expect(metrics.paragraphCount).toBe(3)
  })

  it('reports the heading outline and the citation markers publishing will strip', () => {
    const metrics = measureArticle('# 标题\n\n## 二级\n\n#### 四级\n\n正文。[cite:abc-1][cite:abc-2]')

    expect(metrics.headings).toEqual([
      { level: 2, text: '二级' },
      { level: 4, text: '四级' }
    ])
    expect(metrics.citationMarkerCount).toBe(2)
  })

  it('measures the longest paragraph rather than the whole body', () => {
    const metrics = measureArticle('# 标题\n\n短段。\n\n这一段明显更长一些，用来占位。')

    expect(metrics.longestParagraphCharacters).toBe(15)
  })
})
