/**
 * Stylistic tells that make Chinese prose read as machine-written.
 *
 * Only patterns where the occurrence *is* the defect belong here. Proxy measures
 * of "human-ness" — sentence-length variance, fact density per paragraph — are
 * deliberately absent: a model told to raise them games them, producing inserted
 * short sentences and invented specifics, which reads worse than what it started
 * with and, for facts, breaks the assistant's no-fabrication rule.
 */

export interface AiToneSignals {
  /** Stock turns of phrase. Any occurrence is worth a second look. */
  cadences: Record<string, number>
  /** Explicit discourse scaffolding. Using some is normal; the density is the tell. */
  connectives: Record<string, number>
  /** Edited Chinese feature prose runs roughly 5-10; unedited model prose runs 15-25. */
  connectivesPer1000Characters: number
  /** Phrases asserting that something matters without saying anything about it. */
  emptyEmphasis: Record<string, number>
  /** Corporate-announcement verbs that replace a concrete action with a posture. */
  promoVerbs: Record<string, number>
  /** Whole sentences built from three short balanced clauses, quoted so they can be judged. */
  parallelTriads: string[]
}

const CADENCES: Record<string, RegExp> = {
  '不是……而是……': /不是[^。！？\n]{0,30}而是/g,
  '不仅……更/还': /不仅[^。！？\n]{0,30}(?:更|还|而且)/g,
  '真正的……': /真正的/g,
  '在这个……的时代': /在这个[^。！？\n]{0,20}的时代/g,
  '……的关键在于': /的关键(?:就)?在于/g,
  '综上所述/总而言之': /综上所述|总而言之/g,
  '让我们……': /让我们/g,
  值得深思: /值得深思|引人深思|发人深省/g
}

const CONNECTIVES: Record<string, RegExp> = {
  '因此/因而': /因此|因而/g,
  '此外/除此之外': /此外|除此之外|另外，/g,
  '同时/与此同时': /与此同时|同时，/g,
  '首先/其次/最后': /(?:^|[，。！？\n])(?:首先|其次|再者|最后)[，、]/g,
  值得注意的是: /值得注意的是|需要注意的是|需要指出的是/g,
  '事实上/实际上': /事实上|实际上/g,
  '换句话说/简单来说': /换句话说|也就是说|简单来说|简而言之/g,
  更重要的是: /更重要的是|更关键的是/g,
  '总的来说/总体而言': /总的来说|总体而言|整体来看/g
}

const EMPTY_EMPHASIS: Record<string, RegExp> = {
  空泛评价: /至关重要|不可或缺|举足轻重|毋庸置疑|显而易见|不言而喻/g,
  程度副词: /大大|极大地?|显著地|全方位|前所未有/g
}

const PROMO_VERBS: Record<string, RegExp> = {
  公关体动词: /打造|赋能|助力|抢占|深耕|布局/g
}

const MAX_REPORTED_TRIADS = 8

function countHits(prose: string, patterns: Record<string, RegExp>): Record<string, number> {
  const hits: Record<string, number> = {}
  for (const [label, pattern] of Object.entries(patterns)) {
    const count = prose.match(pattern)?.length ?? 0
    if (count > 0) hits[label] = count
  }
  return hits
}

function sumHits(hits: Record<string, number>): number {
  return Object.values(hits).reduce((total, count) => total + count, 0)
}

/**
 * Three short clauses of similar length making up a whole sentence — the shape of
 * "客户看得懂，搜索引擎抓得到，AI 能够准确提取。". A concrete enumeration has the same
 * shape, so the sentences are returned rather than counted: the model can tell an
 * abstract cadence from a real list once it reads them back.
 */
function findParallelTriads(prose: string): string[] {
  const triads: string[] = []
  for (const sentence of prose.split(/[。！？；\n]/)) {
    const clauses = sentence.trim().split(/[，、]/)
    if (clauses.length !== 3) continue
    const lengths = clauses.map((clause) => clause.trim().length)
    if (lengths.some((length) => length < 3 || length > 14)) continue
    if (Math.max(...lengths) - Math.min(...lengths) > 6) continue
    triads.push(sentence.trim())
    if (triads.length === MAX_REPORTED_TRIADS) break
  }
  return triads
}

export function detectAiToneSignals(prose: string, proseCharacterCount: number): AiToneSignals {
  const connectives = countHits(prose, CONNECTIVES)
  return {
    cadences: countHits(prose, CADENCES),
    connectives,
    connectivesPer1000Characters:
      proseCharacterCount === 0 ? 0 : Math.round((sumHits(connectives) / proseCharacterCount) * 1000),
    emptyEmphasis: countHits(prose, EMPTY_EMPHASIS),
    promoVerbs: countHits(prose, PROMO_VERBS),
    parallelTriads: findParallelTriads(prose)
  }
}
