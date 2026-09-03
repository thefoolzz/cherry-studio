import { parsePublishingContentDraft } from '@shared/utils/publishing'
import MarkdownIt from 'markdown-it'

/**
 * Inline style per HTML tag. WeChat drops `<style>` blocks and class attributes,
 * so every visual rule has to ride along on the element itself. Cover every tag
 * the chat can render: an uncovered tag reaches the WeChat editor bare and gets
 * either stripped or restyled by the editor, which is what makes a published
 * article stop matching the conversation.
 */
const TAG_STYLES: Record<string, string> = {
  p: 'margin:0 0 1em;font-size:16px;line-height:1.8;color:#2b2b2b;letter-spacing:0;',
  h1: 'margin:1.8em 0 .9em;font-size:22px;line-height:1.4;font-weight:700;color:#1f1f1f;letter-spacing:0;',
  h2: 'margin:2em 0 .85em;padding-left:10px;border-left:4px solid #07c160;font-size:20px;line-height:1.45;font-weight:700;color:#1f1f1f;letter-spacing:0;',
  h3: 'margin:1.6em 0 .7em;font-size:17px;line-height:1.5;font-weight:700;color:#333;letter-spacing:0;',
  h4: 'margin:1.4em 0 .6em;font-size:16px;line-height:1.5;font-weight:700;color:#333;letter-spacing:0;',
  h5: 'margin:1.3em 0 .5em;font-size:15px;line-height:1.5;font-weight:700;color:#444;letter-spacing:0;',
  h6: 'margin:1.3em 0 .5em;font-size:14px;line-height:1.5;font-weight:700;color:#666;letter-spacing:0;',
  blockquote: 'margin:1.5em 0;padding:12px 16px;border-left:3px solid #b2b2b2;background:#f7f7f7;color:#555;',
  ul: 'margin:.8em 0 1.2em;padding-left:1.4em;list-style:disc;color:#2b2b2b;',
  ol: 'margin:.8em 0 1.2em;padding-left:1.4em;list-style:decimal;color:#2b2b2b;',
  li: 'margin:.4em 0;font-size:16px;line-height:1.75;',
  table: 'margin:1.5em 0;width:100%;border-collapse:collapse;font-size:15px;line-height:1.6;color:#2b2b2b;',
  thead: 'background:#f7f7f7;',
  th: 'padding:8px 10px;border:1px solid #e3e3e3;font-weight:700;text-align:left;',
  td: 'padding:8px 10px;border:1px solid #e3e3e3;',
  a: 'color:#576b95;text-decoration:none;word-break:break-all;',
  strong: 'font-weight:700;color:#1f1f1f;',
  s: 'text-decoration:line-through;color:#8a8a8a;',
  hr: 'margin:2em auto;width:48px;border:0;border-top:2px solid #d8d8d8;',
  img: 'display:block;max-width:100%;height:auto;margin:1.6em auto;border:0;'
}

const CODE_STYLES = {
  pre: 'margin:1.5em 0;padding:12px 14px;overflow-x:auto;background:#f7f7f7;border-radius:4px;',
  block:
    "font-family:Menlo,Consolas,'Courier New',monospace;font-size:13px;line-height:1.7;color:#2b2b2b;white-space:pre-wrap;word-break:break-all;",
  inline:
    "padding:2px 5px;background:#f2f2f2;border-radius:3px;font-family:Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#2b2b2b;"
}

const SECTION_STYLE =
  "font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.8;color:#2b2b2b;letter-spacing:0;word-break:break-word;"

const markdownRenderer = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: true
})

/** Han, kana, CJK punctuation and full-width forms: the ranges a segment break vanishes between. */
const CJK_CHAR = /[⺀-鿿豈-﫿︰-﹏＀-￯]/

/** Last character before / first character after `index` in an inline token run. */
const neighbourChar = (
  tokens: Parameters<NonNullable<typeof markdownRenderer.renderer.rules.softbreak>>[0],
  index: number,
  step: 1 | -1
): string => {
  for (let cursor = index + step; cursor >= 0 && cursor < tokens.length; cursor += step) {
    const { content } = tokens[cursor]
    if (content) return step === 1 ? content[0] : content[content.length - 1]
  }
  return ''
}

const isStandaloneImage = (
  tokens: Parameters<NonNullable<typeof markdownRenderer.renderer.rules.paragraph_open>>[0],
  index: number
) => {
  const inline = tokens[index + 1]
  return inline?.type === 'inline' && inline.children?.length === 1 && inline.children[0].type === 'image'
}

const renderTokenWithDefaults = markdownRenderer.renderer.renderToken.bind(markdownRenderer.renderer)

/**
 * Style tokens by mutating their attributes and letting markdown-it emit the tag.
 * Returning a hardcoded `<tag style=…>` string instead would bypass the two
 * things the default renderer does for us: skipping `hidden` tokens (the tight
 * list-item paragraphs, which otherwise put a block `<p>` inside every `<li>`
 * and make the WeChat editor split each item in two) and keeping the token's own
 * attributes (`start` on `<ol>`, column alignment on `<td>`, `href` on `<a>`).
 */
markdownRenderer.renderer.renderToken = (tokens, index, options) => {
  const token = tokens[index]
  const style = TAG_STYLES[token.tag]
  // nesting -1 is a closing tag, which must not carry attributes.
  if (style && token.nesting >= 0) {
    const ownStyle = token.attrGet('style')
    token.attrSet('style', ownStyle ? `${style}${ownStyle}` : style)
  }
  return renderTokenWithDefaults(tokens, index, options)
}

/**
 * Resolve a soft line break the way a browser resolves the chat's: dropped
 * between two CJK characters, a single space anywhere else (the CSS segment-break
 * transformation). Emitting the resolved character rather than markdown-it's raw
 * newline keeps the WeChat editor from reinterpreting the whitespace when it
 * re-parses our HTML into its own document model.
 */
markdownRenderer.renderer.rules.softbreak = (tokens, index) =>
  CJK_CHAR.test(neighbourChar(tokens, index, -1)) && CJK_CHAR.test(neighbourChar(tokens, index, 1)) ? '' : ' '

// A lone image needs no paragraph wrapper: the chat renders it in a bare block
// too, and the extra `<p>` margin doubles the gap in the WeChat editor.
markdownRenderer.renderer.rules.paragraph_open = (tokens, index, options, _env, self) =>
  isStandaloneImage(tokens, index) ? '' : self.renderToken(tokens, index, options)
markdownRenderer.renderer.rules.paragraph_close = (tokens, index, options, _env, self) =>
  isStandaloneImage(tokens, index - 2) ? '' : self.renderToken(tokens, index, options)

const renderCodeBlock: NonNullable<typeof markdownRenderer.renderer.rules.fence> = (tokens, index) =>
  `<pre style="${CODE_STYLES.pre}"><code style="${CODE_STYLES.block}">${markdownRenderer.utils.escapeHtml(tokens[index].content)}</code></pre>`

markdownRenderer.renderer.rules.fence = renderCodeBlock
markdownRenderer.renderer.rules.code_block = renderCodeBlock
markdownRenderer.renderer.rules.code_inline = (tokens, index) =>
  `<code style="${CODE_STYLES.inline}">${markdownRenderer.utils.escapeHtml(tokens[index].content)}</code>`

export class WechatContentRenderer {
  render(source: string): string {
    const content = parsePublishingContentDraft(source)
    return `<section style="${SECTION_STYLE}">${markdownRenderer.render(content.markdown)}</section>`
  }
}
