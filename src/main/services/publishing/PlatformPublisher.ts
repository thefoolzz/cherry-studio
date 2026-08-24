import type { PublishingPlatform } from '@shared/data/types/publishing'
import type { BrowserWindow } from 'electron'

export interface PlatformDraftImage {
  id: string
  name: string
  mime: string
  content: string
}

export interface PlatformDraftInput {
  taskId: string
  title: string
  markdown: string
  images?: PlatformDraftImage[]
}

export interface PlatformDraftResult {
  remoteDraftId: string
  editUrl: string
}

export interface PlatformLoginState {
  loggedIn: boolean
  accountName?: string
}

export interface PlatformPublisher {
  readonly platform: PublishingPlatform
  readonly homeUrl: string
  getWindowTitle(displayName: string): string
  readLoginState(window: BrowserWindow): Promise<PlatformLoginState>
  createDraft(window: BrowserWindow, input: PlatformDraftInput): Promise<PlatformDraftResult>
}
