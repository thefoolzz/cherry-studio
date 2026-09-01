import { describe, expect, it } from 'vitest'

import { embedPublishingImages, getEmbeddedImageFileIds } from '../publishingArticleImages'

describe('publishing article images', () => {
  it('places the cover after the title and spreads body images through the article', () => {
    const markdown = ['# 标题', '第一段', '第二段', '第三段', '第四段', '第五段'].join('\n\n')

    const embedded = embedPublishingImages(markdown, ['cover-id', 'body-one', 'body-two'])

    expect(embedded).toBe(
      [
        '# 标题',
        '![Cover image](attachment://cover-id)',
        '第一段',
        '第二段',
        '![Article image 1](attachment://body-one)',
        '第三段',
        '第四段',
        '![Article image 2](attachment://body-two)',
        '第五段'
      ].join('\n\n')
    )
  })

  it('does not duplicate images already embedded by the model', () => {
    const markdown = '# 标题\n\n![封面](attachment://cover-id)\n\n正文\n\n![细节](attachment://body-id)'

    expect(embedPublishingImages(markdown, ['cover-id', 'body-id'])).toBe(markdown)
    expect(getEmbeddedImageFileIds(markdown)).toEqual(['cover-id', 'body-id'])
  })

  it('normalizes a generated image id decorated like a filename', () => {
    const markdown = '# 标题\n\n![封面](attachment://2026-09-01-cover-id)\n\n正文'

    expect(embedPublishingImages(markdown, ['cover-id'])).toBe('# 标题\n\n![封面](attachment://cover-id)\n\n正文')
  })

  it('binds article image positions to generation order when the model swaps ids', () => {
    const markdown = [
      '# 标题',
      '![封面](attachment://2026-09-01-body-id)',
      '第一段',
      '![正文](attachment://2026-09-01-cover-id)'
    ].join('\n\n')

    expect(embedPublishingImages(markdown, ['cover-id', 'body-id'])).toBe(
      ['# 标题', '![封面](attachment://cover-id)', '第一段', '![正文](attachment://body-id)'].join('\n\n')
    )
  })
})
