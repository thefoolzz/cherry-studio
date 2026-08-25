import type { PublishingAccount } from '@shared/data/types/publishing'
import { mockUseQuery } from '@test-mocks/renderer/useDataApi'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  blobToDataUrl: vi.fn(),
  getImageBlobFromSource: vi.fn(),
  request: vi.fn(),
  toSafeFileUrl: vi.fn()
}))

vi.mock('@renderer/ipc', () => ({
  ipcApi: { request: mocks.request }
}))

vi.mock('@renderer/services/mainWindowNavigation', () => ({
  openRoute: vi.fn()
}))

vi.mock('@renderer/utils/image', () => ({
  blobToDataUrl: mocks.blobToDataUrl,
  getImageBlobFromSource: mocks.getImageBlobFromSource
}))

vi.mock('@shared/utils/file', () => ({
  toSafeFileUrl: mocks.toSafeFileUrl
}))

vi.mock('@renderer/components/RichEditor/RichEditor', () => ({
  default: ({
    ariaLabel,
    initialContent,
    onMarkdownChange
  }: {
    ariaLabel?: string
    initialContent?: string
    onMarkdownChange?: (markdown: string) => void
  }) => (
    <textarea
      aria-label={ariaLabel}
      defaultValue={initialContent}
      onChange={(event) => onMarkdownChange?.(event.target.value)}
    />
  )
}))

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'chat.publishing.confirm': 'Confirm publishing',
    'chat.publishing.default_title': 'WeChat article',
    'chat.publishing.dialog.account': 'Publishing account',
    'chat.publishing.dialog.article_title': 'Article title',
    'chat.publishing.dialog.description': 'Create a WeChat draft.',
    'chat.publishing.dialog.submit': 'Create draft',
    'chat.publishing.dialog.title': 'Choose a publishing account',
    'chat.publishing.editor.content': 'Article content',
    'chat.publishing.editor.description': 'Changes apply only to this article draft.',
    'chat.publishing.editor.placeholder': 'Write the article content...',
    'chat.publishing.editor.title': 'Edit article',
    'chat.publishing.hint': 'Choose an account before sending',
    'chat.publishing.success': 'Draft created',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.save': 'Save'
  }

  return {
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => translations[key] ?? options?.defaultValue ?? key
    })
  }
})

import { PublishingDraftAction } from '../PublishingDraftAction'

const account: PublishingAccount = {
  id: 'account-1',
  platform: 'wechat',
  displayName: 'Editorial account',
  partition: 'persist:publishing-test',
  status: 'ready',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z'
}

describe('PublishingDraftAction', () => {
  beforeEach(() => {
    mockUseQuery.mockReset().mockReturnValue({
      data: { items: [account], total: 1, page: 1 },
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      mutate: vi.fn()
    })
    mocks.getImageBlobFromSource.mockReset().mockResolvedValue(new Blob(['image'], { type: 'image/png' }))
    mocks.blobToDataUrl.mockReset().mockResolvedValue('data:image/png;base64,cHJldmlldw==')
    mocks.toSafeFileUrl.mockReset().mockImplementation((path: string) => `file://${path}`)
    mocks.request.mockReset().mockImplementation(async (route: string) => {
      if (route === 'file.batch_get_physical_paths') return { 'image-1': '/tmp/image.png' }
      if (route === 'publishing.prepare_draft') return { id: 'task-1', status: 'prepared' }
      return { id: 'task-1', status: 'created' }
    })
  })

  it('publishes the title and Markdown saved from the article editor', async () => {
    const user = userEvent.setup()
    render(
      <PublishingDraftAction
        markdown={'# Original title\n\nOriginal body is long enough to publish as an article.'}
        topicName="Fallback topic"
        imageFileIds={['image-1']}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('heading', { name: 'Edit article' })).toBeInTheDocument()

    const titleInput = screen.getByLabelText('Article title')
    const contentInput = screen.getByRole('textbox', { name: 'Article content' })
    await user.clear(titleInput)
    await user.type(titleInput, 'Edited title')
    await user.clear(contentInput)
    await user.type(contentInput, 'Edited body is ready for this article only.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await user.click(screen.getByRole('button', { name: 'Confirm publishing' }))
    expect(screen.getByLabelText('Article title')).toHaveValue('Edited title')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await waitFor(() => {
      expect(mocks.request).toHaveBeenNthCalledWith(1, 'publishing.prepare_draft', {
        accountId: account.id,
        title: 'Edited title',
        markdown: 'Edited body is ready for this article only.',
        bodyImageFileIds: ['image-1']
      })
    })
    expect(mocks.request).toHaveBeenNthCalledWith(2, 'publishing.create_draft', { taskId: 'task-1' })
  })

  it('previews attachment images without replacing their publishing source', async () => {
    const user = userEvent.setup()
    render(
      <PublishingDraftAction
        markdown={'# Illustrated article\n\nBefore image.\n\n![Preview](attachment://image-1)\n\nAfter image.'}
        topicName="Fallback topic"
        imageFileIds={['image-1']}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const contentInput = await screen.findByRole('textbox', { name: 'Article content' })
    expect(contentInput).toHaveValue('Before image.\n\n![Preview](data:image/png;base64,cHJldmlldw==)\n\nAfter image.')
    expect(mocks.request).toHaveBeenCalledWith('file.batch_get_physical_paths', { ids: ['image-1'] })
    expect(mocks.toSafeFileUrl).toHaveBeenCalledWith('/tmp/image.png', null)
    expect(mocks.getImageBlobFromSource).toHaveBeenCalledWith('file:///tmp/image.png')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Confirm publishing' }))
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    await waitFor(() => {
      expect(mocks.request).toHaveBeenCalledWith('publishing.prepare_draft', {
        accountId: account.id,
        title: 'Illustrated article',
        markdown: 'Before image.\n\n![Preview](attachment://image-1)\n\nAfter image.',
        bodyImageFileIds: ['image-1']
      })
    })
  })

  it('keeps article editor drafts isolated between generated articles', async () => {
    const user = userEvent.setup()
    render(
      <>
        <section data-testid="first-article">
          <PublishingDraftAction
            markdown={'# First title\n\nThe first article has enough original body content.'}
            topicName="First topic"
          />
        </section>
        <section data-testid="second-article">
          <PublishingDraftAction
            markdown={'# Second title\n\nThe second article has enough original body content.'}
            topicName="Second topic"
          />
        </section>
      </>
    )

    await user.click(within(screen.getByTestId('first-article')).getByRole('button', { name: 'Edit' }))
    const firstTitleInput = screen.getByLabelText('Article title')
    await user.clear(firstTitleInput)
    await user.type(firstTitleInput, 'Edited first title')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit article' })).not.toBeInTheDocument())

    await user.click(within(screen.getByTestId('second-article')).getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Article title')).toHaveValue('Second title')
    expect(screen.getByRole('textbox', { name: 'Article content' })).toHaveValue(
      'The second article has enough original body content.'
    )
  })
})
