/**
 * Inline and fenced code spans — the regions a prose transform must not touch.
 *
 * Stateful (`g` flag): every consumer resets `lastIndex` before scanning.
 */
export const MARKDOWN_CODE_PATTERN = /```[\s\S]*?```|`[^`\n]*`/gm

/** Apply a transform only to prose, preserving inline and fenced code byte-for-byte. */
export function mapMarkdownOutsideCode(content: string, transform: (text: string) => string): string {
  MARKDOWN_CODE_PATTERN.lastIndex = 0
  let cursor = 0
  let result = ''
  let match: RegExpExecArray | null

  while ((match = MARKDOWN_CODE_PATTERN.exec(content)) !== null) {
    result += transform(content.slice(cursor, match.index))
    result += match[0]
    cursor = match.index + match[0].length
  }

  return result + transform(content.slice(cursor))
}
