import { describe, expect, it } from 'vitest'

import { detectAiToneSignals } from '../aiToneSignals'

const measure = (prose: string) => detectAiToneSignals(prose, prose.replace(/\s/g, '').length)

describe('detectAiToneSignals', () => {
  it('scores connective density per 1000 characters rather than by raw count', () => {
    const scaffolded = measure('事实上，因此这里很重要。此外，值得注意的是还有一点。换句话说，就是这样。')
    const plain = measure('事实上只有一句话。' + '本地取车比机场取车便宜三十元。'.repeat(12))

    expect(scaffolded.connectivesPer1000Characters).toBeGreaterThan(100)
    // Same phrase, a real article's worth of prose around it: no longer a tell.
    expect(plain.connectives).toEqual({ '事实上/实际上': 1 })
    expect(plain.connectivesPer1000Characters).toBeLessThan(30)
  })

  it('quotes balanced three-clause sentences so a cadence can be told from a list', () => {
    const signals = measure('客户看得懂，搜索引擎抓得到，AI能够准确提取。上午取车，下午还车，全程两小时。')

    expect(signals.parallelTriads).toEqual([
      '客户看得懂，搜索引擎抓得到，AI能够准确提取',
      '上午取车，下午还车，全程两小时'
    ])
  })

  it('leaves sentences alone that only look like triads', () => {
    // Two clauses, four clauses, and three clauses of wildly different length.
    const signals = measure(
      '车型很多，价格也合适。取车快，还车快，服务好，价格低。他来了，我把那份准备了整整三周的材料交给他。'
    )

    expect(signals.parallelTriads).toEqual([])
  })

  it('reports empty emphasis and corporate verbs separately, since the fix differs', () => {
    const signals = measure('门店布局至关重要，我们要打造品牌，全方位赋能业务。')

    expect(signals.emptyEmphasis).toEqual({ 空泛评价: 1, 程度副词: 1 })
    expect(signals.promoVerbs).toEqual({ 公关体动词: 3 })
  })

  it('reports nothing for prose that carries only concrete statements', () => {
    const signals = measure('海口美兰机场有六家租车公司。七座商务车日租一百五十元，押金三千元。异地还车加收两百元。')

    expect(signals).toEqual({
      cadences: {},
      connectives: {},
      connectivesPer1000Characters: 0,
      emptyEmphasis: {},
      promoVerbs: {},
      parallelTriads: []
    })
  })

  it('caps the quoted triads so a list-shaped article cannot flood the result', () => {
    const signals = measure('甲来了，乙走了，丙留下。'.repeat(20))

    expect(signals.parallelTriads).toHaveLength(8)
  })
})
