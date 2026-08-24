import { parsePublishingContentDraft } from '@shared/utils/publishing'
import MarkdownIt from 'markdown-it'

const markdownRenderer = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true
})

const isStandaloneImage = (
  tokens: Parameters<NonNullable<typeof markdownRenderer.renderer.rules.paragraph_open>>[0],
  index: number
) => {
  const inline = tokens[index + 1]
  return inline?.type === 'inline' && inline.children?.length === 1 && inline.children[0].type === 'image'
}

markdownRenderer.renderer.rules.paragraph_open = (tokens, index) =>
  isStandaloneImage(tokens, index)
    ? ''
    : '<p style="margin:0 0 1em;font-size:16px;line-height:1.8;color:#2b2b2b;letter-spacing:0;">'
markdownRenderer.renderer.rules.paragraph_close = (tokens, index) =>
  isStandaloneImage(tokens, index - 2) ? '' : '</p>'
markdownRenderer.renderer.rules.heading_open = (tokens, index) => {
  const tag = tokens[index].tag === 'h3' ? 'h3' : 'h2'
  const style =
    tag === 'h2'
      ? 'margin:2em 0 .85em;padding-left:10px;border-left:4px solid #07c160;font-size:20px;line-height:1.45;font-weight:700;color:#1f1f1f;letter-spacing:0;'
      : 'margin:1.6em 0 .7em;font-size:17px;line-height:1.5;font-weight:700;color:#333;letter-spacing:0;'
  return `<${tag} style="${style}">`
}
markdownRenderer.renderer.rules.heading_close = (tokens, index) => (tokens[index].tag === 'h3' ? '</h3>' : '</h2>')
markdownRenderer.renderer.rules.blockquote_open = () =>
  '<blockquote style="margin:1.5em 0;padding:12px 16px;border-left:3px solid #b2b2b2;background:#f7f7f7;color:#555;">'
markdownRenderer.renderer.rules.blockquote_close = () => '</blockquote>'
markdownRenderer.renderer.rules.bullet_list_open = () =>
  '<ul style="margin:.8em 0 1.2em;padding-left:1.4em;color:#2b2b2b;">'
markdownRenderer.renderer.rules.ordered_list_open = () =>
  '<ol style="margin:.8em 0 1.2em;padding-left:1.4em;color:#2b2b2b;">'
markdownRenderer.renderer.rules.list_item_open = () => '<li style="margin:.4em 0;font-size:16px;line-height:1.75;">'
markdownRenderer.renderer.rules.strong_open = () => '<strong style="font-weight:700;color:#1f1f1f;">'
markdownRenderer.renderer.rules.hr = () =>
  '<hr style="margin:2em auto;width:48px;border:0;border-top:2px solid #d8d8d8;">'
markdownRenderer.renderer.rules.link_open = (tokens, index, options, _env, self) => {
  tokens[index].attrSet('style', 'color:#576b95;text-decoration:none;word-break:break-all;')
  return self.renderToken(tokens, index, options)
}

const defaultImageRule = markdownRenderer.renderer.rules.image
markdownRenderer.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index]
  token.attrSet('style', 'display:block;width:100%;height:auto;margin:0 auto;border:0;')
  const image = defaultImageRule
    ? defaultImageRule(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options)
  const caption = self.renderInlineAsText(token.children ?? [], options, env).trim()
  const captionHtml = caption
    ? `<figcaption style="margin-top:8px;text-align:center;font-size:13px;line-height:1.6;color:#888;">${markdownRenderer.utils.escapeHtml(caption)}</figcaption>`
    : ''
  return `<figure style="margin:1.6em 0;">${image}${captionHtml}</figure>`
}

export class WechatContentRenderer {
  render(source: string): string {
    const content = parsePublishingContentDraft(source)
    return `<section style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.8;color:#2b2b2b;letter-spacing:0;word-break:break-word;">${markdownRenderer.render(content.markdown)}</section>`
  }
}
