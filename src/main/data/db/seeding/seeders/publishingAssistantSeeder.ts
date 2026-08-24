import { assistantTable } from '@data/db/schemas/assistant'
import { assistantMcpServerTable } from '@data/db/schemas/assistantRelations'
import { mcpServerTable } from '@data/db/schemas/mcpServer'
import { insertWithOrderKey } from '@data/services/utils/orderKey'
import { PRESET_MCP_SERVERS } from '@shared/data/presets/mcpServers'
import { DEFAULT_ASSISTANT_SETTINGS } from '@shared/data/types/assistant'
import { PUBLISHING_ASSISTANT_ID } from '@shared/data/types/publishing'
import { BuiltinMcpServerNames } from '@shared/utils/mcp'
import { eq, isNull } from 'drizzle-orm'
import { app } from 'electron'

import type { DbType, ISeeder } from '../../types'
import { hashObject } from '../hashObject'

export { PUBLISHING_ASSISTANT_ID }

const publishingServerPreset =
  PRESET_MCP_SERVERS.find((preset) => preset.name === BuiltinMcpServerNames.publishing) ??
  (() => {
    throw new Error('Publishing MCP preset is missing')
  })()

const PUBLISHING_ASSISTANT_SEED = {
  emoji: '📝',
  prompt:
    '你是公众号内容生产与发布 Agent，负责通过对话协作完成真实、可发布的微信公众号内容。你不是租车文案工具：产品、服务、门店、活动、品牌、人物、教程、行业观点和其他主题都要按用户当前目标处理。保留通用 Agent 能力：先理解主题、受众、场景、语气和交付目标，再决定是追问资料、搜索核实、整理素材、生成图片还是直接成稿，不要每次套同一套模板。涉及价格、时间、地点、规格、政策、联系方式、优惠、用户评价、引用数据等事实时，只使用用户提供或已核实的信息；不能编造业务细节、客户案例、参数或夸大承诺。信息不全但用户要求先出稿时，用“[待补充：具体信息]”占位，并在结尾列出需要确认的事实。文章要有具体场景、过程、细节和读者收益，让内容像真实业务或真实经验，而不是泛泛介绍。用户要求图片、配图或照片时，必须调用 generate_image 生成合适的图片，至少生成一张封面图，必要时按段落生成正文配图。图片生成完成后必须继续输出完整文章，不能把工具图片作为最终回复；把每张图片按语义放到正文对应位置，使用 generate_image 返回的文件 ID 写成 Markdown 图片，例如 `![封面图](attachment://文件ID)`，不能只写“此处放图片”，也不能把所有图片堆在文章末尾。最终回复直接给出可发布的 Markdown，不要把整篇文章包在 Markdown 代码块中，也不要先输出写作分析。使用一级标题、二级小标题、短段落、列表、引用和清晰 CTA；文章结束后只保留简短的“发布前待确认”清单。用户明确确认后才创建微信公众号草稿；不要群发、定时发布或操作其他平台。',
  description: '将 Markdown 内容整理并创建为微信公众号草稿',
  settings: { ...DEFAULT_ASSISTANT_SETTINGS, enableGenerateImage: true, enableWebSearch: true },
  server: publishingServerPreset
} as const

export class PublishingAssistantSeeder implements ISeeder {
  readonly name = 'publishingAssistant'
  readonly description = 'Install the builtin WeChat publishing assistant and MCP server'
  readonly version: string

  constructor() {
    this.version = hashObject(PUBLISHING_ASSISTANT_SEED)
  }

  run(db: DbType): void {
    db.transaction((tx) => {
      const existing = tx
        .select({ id: assistantTable.id })
        .from(assistantTable)
        .where(eq(assistantTable.id, PUBLISHING_ASSISTANT_ID))
        .limit(1)
        .all()
      if (existing.length > 0) {
        tx.update(assistantTable)
          .set({
            prompt: PUBLISHING_ASSISTANT_SEED.prompt,
            settings: { ...PUBLISHING_ASSISTANT_SEED.settings }
          })
          .where(eq(assistantTable.id, PUBLISHING_ASSISTANT_ID))
          .run()
        return
      }

      let [server] = tx
        .select()
        .from(mcpServerTable)
        .where(eq(mcpServerTable.name, BuiltinMcpServerNames.publishing))
        .limit(1)
        .all()

      if (!server) {
        const [inserted] = tx
          .insert(mcpServerTable)
          .values({
            name: publishingServerPreset.name,
            type: publishingServerPreset.type,
            isActive: true,
            disabledAutoApproveTools: publishingServerPreset.disabledAutoApproveTools,
            provider: publishingServerPreset.provider,
            installSource: 'builtin',
            isTrusted: true
          })
          .returning()
          .all()
        server = inserted
      }

      const assistant = insertWithOrderKey(
        tx,
        assistantTable,
        {
          id: PUBLISHING_ASSISTANT_ID,
          name: this.getNameForPreferredSystemLanguage(),
          emoji: PUBLISHING_ASSISTANT_SEED.emoji,
          prompt: PUBLISHING_ASSISTANT_SEED.prompt,
          description: PUBLISHING_ASSISTANT_SEED.description,
          modelId: null,
          settings: { ...PUBLISHING_ASSISTANT_SEED.settings }
        },
        { pkColumn: assistantTable.id, scope: isNull(assistantTable.deletedAt) }
      )

      tx.insert(assistantMcpServerTable)
        .values([{ assistantId: String(assistant.id), mcpServerId: server.id }])
        .run()
    })
  }

  private getNameForPreferredSystemLanguage(): string {
    try {
      return app.getPreferredSystemLanguages()[0]?.toLowerCase().startsWith('zh')
        ? '公众号发布助手'
        : 'WeChat Publishing Assistant'
    } catch {
      return 'WeChat Publishing Assistant'
    }
  }
}
