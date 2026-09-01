import { setupTestDatabase } from '@test-helpers/db'
import { describe, expect, it } from 'vitest'

import { publishingDataService } from '../PublishingDataService'

describe('PublishingDataService', () => {
  setupTestDatabase()

  it.each(['douyin', 'xiaohongshu', 'zhihu'] as const)('persists a %s account', (platform) => {
    const account = publishingDataService.createAccount({
      platform,
      displayName: platform,
      partition: `persist:publishing-test-${platform}`
    })

    expect(publishingDataService.getAccount(account.id)).toMatchObject({
      platform,
      displayName: platform,
      status: 'binding'
    })
  })

  it('creates, edits, lists, and deletes a reusable writing template', () => {
    const template = publishingDataService.createTemplate({
      name: 'Case study',
      description: 'A narrative case-study structure',
      sourceType: 'url',
      sourceTitle: 'Reference article',
      sourceUrl: 'https://example.com/article',
      blueprint: {
        contentType: 'case study',
        summary: 'Moves from a concrete problem to evidence and a qualified conclusion.',
        voice: ['Specific and restrained'],
        structure: [{ role: 'Opening', guidance: 'Begin with the conflict, not background.', required: true }],
        writingRules: ['Vary paragraph length'],
        avoid: ['Do not copy facts from the source article'],
        variables: [{ name: 'evidence', description: 'Verified evidence for the new case', required: true }],
        qualityChecks: ['Every claim is supported by supplied evidence']
      }
    })

    const updated = publishingDataService.updateTemplate(template.id, {
      name: 'Edited case study',
      blueprint: { ...template.blueprint, voice: ['Conversational and restrained'] }
    })

    expect(updated.name).toBe('Edited case study')
    expect(updated.blueprint.voice).toEqual(['Conversational and restrained'])
    expect(publishingDataService.listTemplates({ limit: 20 }).items).toEqual([updated])

    publishingDataService.deleteTemplate(template.id)
    expect(publishingDataService.listTemplates()).toMatchObject({ items: [], total: 0 })
  })
})
