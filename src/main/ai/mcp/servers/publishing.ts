import { application } from '@application'
import { loggerService } from '@logger'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js'
import type { PublishingAccount, PublishingTask } from '@shared/data/types/publishing'
import * as z from 'zod'

const logger = loggerService.withContext('McpServer:Publishing')

const ACCOUNT_ID_SCHEMA = z.strictObject({ accountId: z.string().min(1) })
const TASK_ID_SCHEMA = z.strictObject({ taskId: z.string().min(1) })
const START_BINDING_SCHEMA = z.strictObject({ displayName: z.string().trim().min(1).max(120) })
const PREPARE_SCHEMA = z.strictObject({
  accountId: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  markdown: z.string().min(1),
  bodyImageFileIds: z.array(z.string().min(1)).max(64).optional(),
  coverFileId: z.string().min(1).optional()
})

const TOOLS: Tool[] = [
  {
    name: 'list_accounts',
    description: 'List bound WeChat Official Account identities without exposing session credentials.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'start_account_binding',
    description: 'Create a WeChat Official Account identity and open its isolated login window.',
    inputSchema: {
      type: 'object',
      properties: { displayName: { type: 'string', description: 'Human-readable account label.' } },
      required: ['displayName']
    }
  },
  {
    name: 'get_account_status',
    description: 'Check the current login state of a bound account.',
    inputSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] }
  },
  {
    name: 'prepare_draft',
    description: 'Persist a platform-neutral Markdown snapshot as a prepared draft task for the selected account.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        title: { type: 'string' },
        markdown: { type: 'string' },
        bodyImageFileIds: { type: 'array', items: { type: 'string' } },
        coverFileId: { type: 'string' }
      },
      required: ['accountId', 'title', 'markdown']
    }
  },
  {
    name: 'create_draft',
    description: 'Create the prepared task as a platform draft. This is an approval-gated action.',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] }
  },
  {
    name: 'get_publish_task',
    description: 'Read a single publishing task and its current status.',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] }
  },
  {
    name: 'list_publish_tasks',
    description: 'List recent publishing tasks, optionally filtered by account.',
    inputSchema: { type: 'object', properties: { accountId: { type: 'string' } } }
  },
  {
    name: 'retry_publish_task',
    description: 'Retry a failed task that has not produced a remote draft ID. This is an approval-gated action.',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] }
  },
  {
    name: 'cancel_publish_task',
    description: 'Cancel a prepared task that has not started draft creation.',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] }
  }
]

function accountView(account: PublishingAccount) {
  return {
    accountId: account.id,
    platform: account.platform,
    displayName: account.displayName,
    status: account.status,
    lastVerifiedAt: account.lastVerifiedAt
  }
}

function taskView(task: PublishingTask) {
  return {
    taskId: task.id,
    accountId: task.accountId,
    title: task.title,
    characterCount: task.markdown.length,
    mediaCount: task.imageFileEntryIds.length + (task.coverFileEntryId ? 1 : 0),
    status: task.status,
    remoteDraftId: task.remoteDraftId,
    editUrl: task.editUrl,
    error: task.error
  }
}

function result(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] }
}

/** In-process MCP server exposed to Cherry's MCP client and API Gateway bridge. */
export class PublishingServer {
  public readonly mcpServer: McpServer

  constructor() {
    this.mcpServer = new McpServer(
      { name: '@post-studio/publishing', version: '1.0.0' },
      { capabilities: { tools: {} } }
    )
    this.registerHandlers()
  }

  private registerHandlers(): void {
    this.mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))
    this.mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name
      const args = request.params.arguments ?? {}
      const service = application.get('PublishingService')

      try {
        switch (toolName) {
          case 'list_accounts':
            return result({ success: true, accounts: service.listAccounts().map(accountView) })
          case 'start_account_binding': {
            const input = START_BINDING_SCHEMA.parse(args)
            const account = await service.startAccountBinding(input.displayName)
            return result({ success: true, ...accountView(account) })
          }
          case 'get_account_status': {
            const input = ACCOUNT_ID_SCHEMA.parse(args)
            const account = await service.getAccountStatus(input.accountId)
            return result({ success: true, ...accountView(account) })
          }
          case 'prepare_draft': {
            const input = PREPARE_SCHEMA.parse(args)
            const task = service.prepareDraft({
              accountId: input.accountId,
              title: input.title,
              markdown: input.markdown,
              bodyImageFileIds: input.bodyImageFileIds,
              coverFileEntryId: input.coverFileId
            })
            return result({ success: true, ...taskView(task) })
          }
          case 'create_draft': {
            const input = TASK_ID_SCHEMA.parse(args)
            const task = await service.createDraft(input.taskId)
            return result({ success: task.status === 'created', ...taskView(task) })
          }
          case 'get_publish_task': {
            const input = TASK_ID_SCHEMA.parse(args)
            const task = service.getPublishTask(input.taskId)
            return result({ success: true, ...taskView(task) })
          }
          case 'list_publish_tasks': {
            const accountId = z.string().min(1).optional().parse(args.accountId)
            const tasks = service.listPublishTasks(accountId)
            return result({ success: true, tasks: tasks.map(taskView) })
          }
          case 'retry_publish_task': {
            const input = TASK_ID_SCHEMA.parse(args)
            const task = await service.retryPublishTask(input.taskId)
            return result({ success: task.status === 'created', ...taskView(task) })
          }
          case 'cancel_publish_task': {
            const input = TASK_ID_SCHEMA.parse(args)
            const task = service.cancelPublishTask(input.taskId)
            return result({ success: task.status === 'cancelled', ...taskView(task) })
          }
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Tool error: ${toolName}`, { error: message })
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, message }) }],
          isError: true
        }
      }
    })
  }
}

export default PublishingServer
