import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createTemplate: vi.fn(),
  fetchArticle: vi.fn(),
  getTemplate: vi.fn(),
  listTemplates: vi.fn()
}))

vi.mock('@data/services/PublishingDataService', () => ({
  publishingDataService: {
    createTemplate: mocks.createTemplate,
    getTemplate: mocks.getTemplate,
    listTemplates: mocks.listTemplates
  }
}))

vi.mock('@main/services/webSearch', () => ({
  fetchWebSearchContent: mocks.fetchArticle
}))

import PublishingServer from '../publishing'

async function callTool(server: PublishingServer, name: string, args: Record<string, unknown> = {}) {
  const handlers = (server.mcpServer.server as any)._requestHandlers
  return handlers.get('tools/call')({ method: 'tools/call', params: { name, arguments: args } }, {})
}

function parseResult(result: { content: Array<{ text?: string }> }) {
  return JSON.parse(result.content[0]?.text ?? '{}')
}

const blueprint = {
  contentType: 'case study',
  summary: 'A reusable narrative strategy',
  voice: ['Specific'],
  structure: [{ role: 'Conflict', guidance: 'Open with a real conflict.', required: true }],
  writingRules: ['Vary paragraph length'],
  avoid: ['Do not reuse source facts'],
  variables: [{ name: 'evidence', description: 'Evidence for the new topic', required: true }],
  qualityChecks: ['Claims match supplied evidence']
}

describe('PublishingServer writing templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns readable article Markdown for template extraction from a URL', async () => {
    mocks.fetchArticle.mockResolvedValue({
      title: 'Reference article',
      url: 'https://example.com/article',
      content: '# Reference article\n\nA distinctive opening.'
    })

    const result = parseResult(
      await callTool(new PublishingServer(), 'read_article_source', { url: 'https://example.com/article' })
    )

    expect(result).toEqual({
      success: true,
      title: 'Reference article',
      url: 'https://example.com/article',
      markdown: '# Reference article\n\nA distinctive opening.',
      truncated: false
    })
  })

  it('persists only the structured blueprint produced from the source article', async () => {
    const saved = {
      id: '1b253116-0291-448b-9a3f-109a42b03b48',
      name: 'Case study',
      description: 'Narrative case study',
      sourceType: 'url',
      sourceTitle: 'Reference article',
      sourceUrl: 'https://example.com/article',
      blueprint,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    }
    mocks.createTemplate.mockReturnValue(saved)

    const result = parseResult(
      await callTool(new PublishingServer(), 'save_writing_template', {
        name: saved.name,
        description: saved.description,
        sourceType: saved.sourceType,
        sourceTitle: saved.sourceTitle,
        sourceUrl: saved.sourceUrl,
        blueprint
      })
    )

    expect(mocks.createTemplate).toHaveBeenCalledWith({
      name: saved.name,
      description: saved.description,
      sourceType: saved.sourceType,
      sourceTitle: saved.sourceTitle,
      sourceUrl: saved.sourceUrl,
      blueprint
    })
    expect(result).toMatchObject({ success: true, templateId: saved.id, contentType: 'case study' })
    expect(result).not.toHaveProperty('markdown')
  })

  it('measures a finished draft against the length the user asked for', async () => {
    const result = parseResult(
      await callTool(new PublishingServer(), 'review_article', {
        markdown: '# 标题\n\n真正的问题在别处。[cite:abc-1]\n\n真正的答案只有一个。',
        targetCharacters: 100
      })
    )

    expect(result).toMatchObject({
      success: true,
      targetCharacters: 100,
      deltaFromTarget: result.characterCount - 100,
      paragraphCount: 2,
      aiTone: { cadences: { '真正的……': 2 } },
      citationMarkerCount: 1
    })
    // The model already has its own draft; echoing it back only burns context.
    expect(result).not.toHaveProperty('markdown')
  })

  it('accepts targetCharacters 0 as "no length given" instead of failing the call', async () => {
    // Observed in the running app: the model fills the optional number with 0, and
    // a rejected call costs a retry that re-sends the entire draft.
    const result = parseResult(
      await callTool(new PublishingServer(), 'review_article', {
        markdown: '# 标题\n\n正文内容。',
        targetCharacters: 0
      })
    )

    expect(result.success).toBe(true)
    expect(result).not.toHaveProperty('targetCharacters')
    expect(result).not.toHaveProperty('deltaFromTarget')
  })
})
