// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'

import type { PublishingTemplate } from '@shared/data/types/publishing'
import { mockUseMutation, mockUseQuery } from '@test-mocks/renderer/useDataApi'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn()
}))

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.description': 'Description',
    'common.name': 'Name',
    'common.save': 'Save',
    'writing_templates.add_section': 'Add section',
    'writing_templates.add_variable': 'Add variable',
    'writing_templates.avoid': 'Avoid',
    'writing_templates.content_type': 'Content type',
    'writing_templates.edit_action': 'Edit {{name}}',
    'writing_templates.edit_title': 'Edit writing template',
    'writing_templates.editor_description': 'Edit reusable writing guidance without source facts.',
    'writing_templates.one_per_line': 'One item per line',
    'writing_templates.quality_checks': 'Quality checks',
    'writing_templates.remove_section': 'Remove section',
    'writing_templates.remove_variable': 'Remove variable',
    'writing_templates.required': 'Required',
    'writing_templates.section_guidance': 'Section guidance',
    'writing_templates.section_role': 'Section role',
    'writing_templates.strategy_summary': 'Strategy summary',
    'writing_templates.structure': 'Structure',
    'writing_templates.structure_hint': 'Each section describes a job, not fixed copy.',
    'writing_templates.variables': 'Variables',
    'writing_templates.variables_hint': 'Information that changes for every article.',
    'writing_templates.variable_description': 'Variable description',
    'writing_templates.variable_name': 'Variable name',
    'writing_templates.voice': 'Voice and rhythm',
    'writing_templates.writing_rules': 'Writing rules'
  }
  return {
    useTranslation: () => ({
      t: (key: string, options?: { name?: string }) =>
        (translations[key] ?? key).replace('{{name}}', options?.name ?? ''),
      i18n: { language: 'en-US' }
    })
  }
})

import WritingTemplatesPage from '../WritingTemplatesPage'

const template: PublishingTemplate = {
  id: '1b253116-0291-448b-9a3f-109a42b03b48',
  name: 'Story arc',
  description: 'A narrative structure for product stories',
  sourceType: 'url',
  sourceTitle: 'Reference article',
  sourceUrl: 'https://example.com/article',
  blueprint: {
    contentType: 'Product story',
    summary: 'Begin with tension, show evidence, and close with a qualified resolution.',
    voice: ['Specific and conversational'],
    structure: [{ role: 'Conflict', guidance: 'Open with a real conflict.', required: true }],
    writingRules: ['Vary paragraph length'],
    avoid: ['Generic hooks'],
    variables: [{ name: 'evidence', description: 'Verified evidence', required: true }],
    qualityChecks: ['Every claim has support']
  },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
}

describe('WritingTemplatesPage', () => {
  beforeEach(() => {
    mocks.update.mockReset().mockResolvedValue(template)
    mockUseQuery.mockReset().mockReturnValue({
      data: { items: [template], total: 1, page: 1 },
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      mutate: vi.fn()
    })
    mockUseMutation.mockReset().mockImplementation((_method, path) => ({
      trigger: path === '/publishing-templates/:id' ? mocks.update : vi.fn(),
      isLoading: false,
      error: undefined
    }))
  })

  it('lets the user edit a saved template from the template library', async () => {
    const user = userEvent.setup()
    render(<WritingTemplatesPage />)

    await user.click(screen.getByRole('button', { name: 'Edit Story arc' }))
    expect(screen.getByRole('heading', { name: 'Edit writing template' })).toBeInTheDocument()

    const name = screen.getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Flexible story arc')
    await user.clear(screen.getByLabelText('Section guidance'))
    await user.type(screen.getByLabelText('Section guidance'), 'Open with a verified conflict and its stakes.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledWith({
        params: { id: template.id },
        body: expect.objectContaining({
          name: 'Flexible story arc',
          blueprint: expect.objectContaining({
            structure: [{ role: 'Conflict', guidance: 'Open with a verified conflict and its stakes.', required: true }]
          })
        })
      })
    })
  })

  it('constrains a long content type label to its template card', () => {
    const contentType =
      'Decision-oriented travel rental article for readers comparing passengers, luggage, routes, usage cycles, and delivery terms.'
    mockUseQuery.mockReturnValue({
      data: {
        items: [{ ...template, blueprint: { ...template.blueprint, contentType } }],
        total: 1,
        page: 1
      },
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
      mutate: vi.fn()
    })

    render(<WritingTemplatesPage />)

    expect(screen.getByText(contentType)).toHaveClass('max-w-full', 'truncate')
    expect(screen.getByText(contentType)).toHaveAttribute('title', contentType)
  })
})
