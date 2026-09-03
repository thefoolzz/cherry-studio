import type * as CherryStudioUi from '@cherrystudio/ui'
import { Markdown, StreamingMarkdown } from '@cherrystudio/ui'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChatMarkdownRenderProvider } from '../ChatMarkdownRenderContext'
import { CHAT_MARKDOWN_COMPONENTS, CHAT_MARKDOWN_COMPONENTS_WITH_STYLE } from '../ChatMarkdownRenderers'

const mocks = vi.hoisted(() => ({
  CodeBlock: vi.fn(({ children, isStreaming }: { children: string; isStreaming: boolean }) => (
    <code data-streaming={String(isStreaming)}>{children}</code>
  ))
}))

vi.mock('@cherrystudio/ui', async (importOriginal) => importOriginal<typeof CherryStudioUi>())
vi.mock('../CodeBlock', () => ({ default: mocks.CodeBlock }))
vi.mock('@renderer/components/ImageViewer', () => ({
  __esModule: true,
  default: ({ src, alt }: { src?: string; alt?: string }) => <img src={src} alt={alt} />
}))

const EMPTY_CITATIONS = new Map()

function renderCode(isStreaming: boolean) {
  return (
    <ChatMarkdownRenderProvider blockId="message-part" citationRegistry={EMPTY_CITATIONS} isStreaming={isStreaming}>
      <StreamingMarkdown
        id="message-part"
        components={CHAT_MARKDOWN_COMPONENTS}
        animated={false}
        parseIncompleteMarkdown={isStreaming}>
        {'```typescript\nconst first = 1\n```\n\n```typescript\nconst second = 2\n```'}
      </StreamingMarkdown>
    </ChatMarkdownRenderProvider>
  )
}

function renderAttachmentImage(attachmentFileUrls: ReadonlyMap<string, string>) {
  return (
    <ChatMarkdownRenderProvider
      blockId="message-part"
      citationRegistry={EMPTY_CITATIONS}
      attachmentFileUrls={attachmentFileUrls}
      isStreaming={false}>
      <Markdown id="message-part" components={CHAT_MARKDOWN_COMPONENTS}>
        {'![封面](attachment://image-1)'}
      </Markdown>
    </ChatMarkdownRenderProvider>
  )
}

describe('ChatMarkdown renderers', () => {
  it('shares renderer types between the base and style-enabled registries', () => {
    for (const tag of Object.keys(CHAT_MARKDOWN_COMPONENTS)) {
      expect(CHAT_MARKDOWN_COMPONENTS_WITH_STYLE[tag]).toBe(CHAT_MARKDOWN_COMPONENTS[tag])
    }
  })

  it('keeps code renderer nodes mounted when streaming settles', () => {
    const { rerender } = render(renderCode(true))
    const firstCode = screen.getByText('const first = 1')
    const secondCode = screen.getByText('const second = 2')

    expect(firstCode).toHaveAttribute('data-streaming', 'true')
    expect(secondCode).toHaveAttribute('data-streaming', 'true')

    rerender(renderCode(false))

    expect(screen.getByText('const first = 1')).toBe(firstCode)
    expect(screen.getByText('const second = 2')).toBe(secondCode)
    expect(firstCode).toHaveAttribute('data-streaming', 'false')
    expect(secondCode).toHaveAttribute('data-streaming', 'false')
  })

  it('resolves an attachment image reference to the url supplied by the render context', () => {
    render(renderAttachmentImage(new Map([['image-1', 'blob:generated-cover']])))

    expect(screen.getByRole('img', { name: '封面' })).toHaveAttribute('src', 'blob:generated-cover')
  })

  it('renders no image until the attachment reference resolves', () => {
    render(renderAttachmentImage(new Map()))

    expect(screen.queryByRole('img')).toBeNull()
  })
})
