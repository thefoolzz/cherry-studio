import { mapMarkdownOutsideCode } from './markdown'

const PENDING_SECTION_HEADING = /^(?:#{1,3})\s*(?:发布前检查|发布前待确认|待确认事项)\s*$/
const PENDING_PLACEHOLDER = /\[待补充[：:]\s*([^\]]+)\]/g
const ARTICLE_TITLE_HEADING = /^\s{0,3}#\s+\S/

/**
 * Inline citation marker the assistant echoes back for tool results, together
 * with the space separating it from the preceding sentence.
 *
 * Deliberately looser than the renderer's marker pattern, which has to match an
 * id it can resolve: a published article resolves nothing, so every bracket
 * spelling the model produces (`[cite:a, b]`, `[cite: a][cite: b]`, even an
 * empty `[cite:]`) has to go rather than reach the platform as visible text.
 */
const CITATION_MARKER = /[ \t]?\[cite:[^\]\n]*\]/g

export interface PublishingContentDraft {
  title?: string
  markdown: string
  pendingFacts: string[]
}

export function normalizePublishingMarkdown(source: string): string {
  const fenced = source.match(/```(?:markdown|md)\s*\n([\s\S]*?)\n```/i)?.[1]
  const withoutMarkers = mapMarkdownOutsideCode(fenced ?? source, (text) => text.replace(CITATION_MARKER, ''))
  const normalized = withoutMarkers.trim()
  const lines = normalized.split('\n')
  const articleStartIndex = lines.findIndex((line) => ARTICLE_TITLE_HEADING.test(line))
  return (articleStartIndex > 0 ? lines.slice(articleStartIndex).join('\n') : normalized).trim()
}

export function parsePublishingContentDraft(source: string): PublishingContentDraft {
  const lines = normalizePublishingMarkdown(source).split('\n')
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  const titleMatch = firstContentIndex >= 0 ? lines[firstContentIndex].match(/^\s{0,3}#\s+(.+?)\s*$/) : undefined
  const title = titleMatch?.[1].replace(/[*_`]/g, '').trim()
  if (title) lines.splice(firstContentIndex, 1)

  const pendingSectionIndex = lines.findIndex((line) => PENDING_SECTION_HEADING.test(line.trim()))
  const pendingSectionLines = pendingSectionIndex >= 0 ? lines.splice(pendingSectionIndex) : []
  const pendingFacts = pendingSectionLines.slice(1).flatMap((line) => {
    const item = line.match(/^\s*(?:[-*+] |\d+[.)]\s+)(.+?)\s*$/)?.[1]
    return item ? [item.replace(/[*_`]/g, '').trim()] : []
  })

  const bodyLines = lines.filter((line) => {
    const placeholders = [...line.matchAll(PENDING_PLACEHOLDER)]
    pendingFacts.push(...placeholders.map((match) => match[1].trim()))
    return placeholders.length === 0
  })

  return {
    ...(title ? { title } : {}),
    markdown: bodyLines.join('\n').trim(),
    pendingFacts: [...new Set(pendingFacts.filter(Boolean))].slice(0, 4)
  }
}
