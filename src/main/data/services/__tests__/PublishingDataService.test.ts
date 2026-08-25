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
})
