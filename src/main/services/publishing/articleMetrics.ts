import { parsePublishingContentDraft } from '@shared/utils/publishing'

import { type AiToneSignals, detectAiToneSignals } from './aiToneSignals'

/**
 * Facts about a draft that a language model cannot compute about its own output:
 * counts, positions, and repetitions. Each field exists because a writing rule in
 * the publishing assistant's prompt depends on it — a rule stated but unmeasured
 * is a rule the model can only guess at.
 */
export interface ArticleMetrics {
  /** Body characters excluding whitespace and Markdown syntax, after the title and checklist are removed. */
  characterCount: number
  targetCharacters?: number
  /** Positive when the body is over target, negative when under. */
  deltaFromTarget?: number
  paragraphCount: number
  longestParagraphCharacters: number
  headings: Array<{ level: number; text: string }>
  aiTone: AiToneSignals
  /** Paragraph openings that repeat, which is what mechanical parallelism looks like. */
  repeatedParagraphOpenings: string[]
  /** `[待补充：…]` left in the body. Publishing drops the whole line, so the sentence disappears. */
  droppedPlaceholderLines: string[]
  /** Pre-publish checklist items the draft asks the author to confirm. */
  pendingFacts: string[]
  /** `[cite:…]` markers. Publishing strips them, so these claims ship without a visible source. */
  citationMarkerCount: number
}

const PENDING_PLACEHOLDER_LINE = /^.*\[待补充[：:][^\]]+\].*$/gm
const CITATION_MARKER = /\[cite:[^\]\n]*\]/g

/** Strip Markdown syntax so a character count measures prose, not punctuation. */
function toProse(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/[*_~`]/g, '')
}

function countProseCharacters(markdown: string): number {
  return toProse(markdown).replace(/\s/g, '').length
}

export function measureArticle(source: string, targetCharacters?: number): ArticleMetrics {
  const draft = parsePublishingContentDraft(source)
  const paragraphs = draft.markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  const proseParagraphs = paragraphs.filter((block) => !/^\s{0,3}(?:#{1,6}\s|```)/.test(block))

  const openings = new Map<string, number>()
  for (const paragraph of proseParagraphs) {
    const opening = toProse(paragraph).replace(/\s/g, '').slice(0, 6)
    if (opening.length === 6) openings.set(opening, (openings.get(opening) ?? 0) + 1)
  }

  const prose = toProse(draft.markdown)
  const characterCount = countProseCharacters(draft.markdown)

  return {
    characterCount,
    ...(targetCharacters === undefined ? {} : { targetCharacters, deltaFromTarget: characterCount - targetCharacters }),
    paragraphCount: proseParagraphs.length,
    longestParagraphCharacters: Math.max(0, ...proseParagraphs.map(countProseCharacters)),
    headings: [...draft.markdown.matchAll(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/gm)].map((match) => ({
      level: match[1].length,
      text: match[2]
    })),
    aiTone: detectAiToneSignals(prose, characterCount),
    repeatedParagraphOpenings: [...openings].filter(([, count]) => count > 1).map(([opening]) => opening),
    droppedPlaceholderLines: source.match(PENDING_PLACEHOLDER_LINE) ?? [],
    pendingFacts: draft.pendingFacts,
    citationMarkerCount: source.match(CITATION_MARKER)?.length ?? 0
  }
}
