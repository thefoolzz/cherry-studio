// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'

import type { PublishingAccount } from '@shared/data/types/publishing'
import { mockUseQuery } from '@test-mocks/renderer/useDataApi'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('@renderer/ipc', () => ({
  ipcApi: { request: mocks.request },
  useIpcOn: vi.fn()
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
    i18n: { language: 'en-US' }
  })
}))

import PlatformAccountsPage from '../PlatformAccountsPage'

const douyinAccount: PublishingAccount = {
  id: 'bdcf949a-a718-4ad2-a267-154b34cfdcf6',
  platform: 'douyin',
  displayName: 'Douyin',
  partition: 'persist:post-studio-douyin-test',
  status: 'binding',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z'
}

describe('PlatformAccountsPage', () => {
  beforeEach(() => {
    mocks.request.mockReset().mockResolvedValue(douyinAccount)
    mockUseQuery.mockReset().mockImplementation((path) => ({
      data: path === '/publishing-accounts' ? { items: [], total: 0, page: 1 } : undefined,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn().mockResolvedValue(undefined)
    }))
  })

  it('starts binding from a platform choice without asking for a name', async () => {
    const user = userEvent.setup()
    render(<PlatformAccountsPage />)

    await user.click(screen.getAllByRole('button', { name: 'Bind account' })[0])

    expect(screen.getByRole('heading', { name: 'Select a platform' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xiaohongshu/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Zhihu/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Douyin/ }))

    await waitFor(() => {
      expect(mocks.request).toHaveBeenCalledWith('publishing.start_account_binding', { platform: 'douyin' })
    })
  })
})
