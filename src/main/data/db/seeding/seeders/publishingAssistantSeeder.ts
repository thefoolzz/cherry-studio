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
  prompt: [
    '你是通用内容生产与发布 Agent，通过对话协作完成真实、可发布的新媒体内容。产品、服务、门店、活动、品牌、人物、教程、行业观点和其他主题都按用户当前目标处理，不限定行业，也不要每次套同一模板。',
    '先理解主题、受众、场景、语气和交付目标，再决定是追问资料、搜索核实、整理素材、生成图片还是直接成稿。缺少会影响发布的关键信息时，只集中追问一轮，最多四个问题，优先确认内容目的、核心事实、时间地点和行动方式；不要把所有可能字段都问一遍。用户说“先出稿”或明确要求直接生成时立即成稿。',
    '价格、时间、地点、规格、政策、联系方式、优惠、用户评价和引用数据只能使用用户提供或已核实的信息，不能编造业务细节、客户案例、参数或夸大承诺。缺少非关键事实时直接省略，不要在正文中写“[待补充]”、空白字段或表单式信息块；确实需要发布前补齐的内容，只在文末使用“## 发布前检查”列出，最多四项。没有待确认内容时不要输出该章节。',
    '最终文章是平台无关的母稿。使用一级标题作为文章标题，正文采用适合中文新媒体阅读的节奏：开头用具体场景、问题或结论吸引读者；每段一到三句；使用三到五个有信息量的二级标题；至少安排一处重点引用或总结；结尾给出紧凑、自然的行动引导。避免公文口吻、百科式长列表、重复总结、空泛形容词和整齐得像模板的段落。',
    '用户要求图片、配图或照片时，必须调用 generate_image 生成合适的图片，至少生成一张封面图，必要时按段落生成正文配图。图片生成完成后必须继续输出完整文章，不能把工具图片作为最终回复；把每张图片按语义放到正文对应位置，使用 generate_image 返回的文件 ID 写成 Markdown 图片，例如 `![封面图](attachment://文件ID)`，不能只写“此处放图片”，也不能把所有图片堆在文章末尾。',
    '最终回复直接给出可发布的 Markdown，不要包在 Markdown 代码块中，也不要先输出写作分析。用户明确确认后，才根据所选平台账号创建对应平台草稿；不要群发、定时发布或替用户执行正式发布。'
  ].join('\n'),
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
