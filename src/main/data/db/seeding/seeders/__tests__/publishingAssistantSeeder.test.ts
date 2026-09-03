import { appStateTable } from '@data/db/schemas/appState'
import { assistantTable } from '@data/db/schemas/assistant'
import { hashObject } from '@data/db/seeding/hashObject'
import { PublishingAssistantSeeder } from '@data/db/seeding/seeders/publishingAssistantSeeder'
import { PUBLISHING_ASSISTANT_ID } from '@shared/data/types/publishing'
import { setupTestDatabase } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

const FINGERPRINT_KEY = 'publishingAssistant:seededFingerprint'

describe('PublishingAssistantSeeder', () => {
  const dbh = setupTestDatabase()

  const readAssistant = async () => {
    const [row] = await dbh.db
      .select()
      .from(assistantTable)
      .where(eq(assistantTable.id, PUBLISHING_ASSISTANT_ID))
      .limit(1)
    return row
  }

  const writePrompt = async (prompt: string) => {
    await dbh.db.update(assistantTable).set({ prompt }).where(eq(assistantTable.id, PUBLISHING_ASSISTANT_ID))
  }

  const readFingerprint = async () => {
    const [row] = await dbh.db
      .select({ value: appStateTable.value })
      .from(appStateTable)
      .where(eq(appStateTable.key, FINGERPRINT_KEY))
      .limit(1)
    return row?.value as { promptHash: string; settingsHash: string } | undefined
  }

  it('recognizes the settings it wrote itself, so a reseed can still refresh them', async () => {
    new PublishingAssistantSeeder().run(dbh.db)

    const assistant = await readAssistant()
    const fingerprint = await readFingerprint()

    // JSON round-trips through SQLite; if key order shifted, every upgrade would
    // read its own settings as a user edit and stop refreshing them forever.
    expect(hashObject(assistant.settings)).toBe(fingerprint?.settingsHash)
    expect(hashObject(assistant.prompt)).toBe(fingerprint?.promptHash)
  })

  it('defaults published articles to a cover and scene-specific inline illustrations', async () => {
    new PublishingAssistantSeeder().run(dbh.db)

    const assistant = await readAssistant()
    const prompt = assistant.prompt

    expect(assistant.settings.enableGenerateImage).toBe(true)
    expect(prompt).toContain('短稿或单一观点默认封面加一张正文图')
    expect(prompt).toContain('常规文章默认封面加两到三张正文图')
    expect(prompt).toContain('封面图紧跟一级标题并位于导语之前')
    expect(prompt).toContain('只有用户明确表示不要图片时才跳过')
  })

  it('refreshes a prompt left over from an earlier release', async () => {
    const seeder = new PublishingAssistantSeeder()
    seeder.run(dbh.db)
    const currentPrompt = (await readAssistant()).prompt

    // The state an older release leaves behind: its prompt, and its fingerprint.
    await writePrompt('旧版种子提示词')
    await dbh.db
      .update(appStateTable)
      .set({
        value: { promptHash: hashObject('旧版种子提示词'), settingsHash: (await readFingerprint())!.settingsHash }
      })
      .where(eq(appStateTable.key, FINGERPRINT_KEY))

    seeder.run(dbh.db)

    expect((await readAssistant()).prompt).toBe(currentPrompt)
  })

  it('keeps a prompt the user edited', async () => {
    const seeder = new PublishingAssistantSeeder()
    seeder.run(dbh.db)
    await writePrompt('我自己改的提示词')

    seeder.run(dbh.db)
    // Still kept on the upgrade after that one, not just the first.
    seeder.run(dbh.db)

    expect((await readAssistant()).prompt).toBe('我自己改的提示词')
  })

  it('keeps settings the user changed while refreshing the prompt it owns', async () => {
    const seeder = new PublishingAssistantSeeder()
    seeder.run(dbh.db)
    const seededPrompt = (await readAssistant()).prompt
    const customized = { ...(await readAssistant()).settings, temperature: 0.3, enableTemperature: true }

    await dbh.db
      .update(assistantTable)
      .set({ settings: customized, prompt: '旧版种子提示词' })
      .where(eq(assistantTable.id, PUBLISHING_ASSISTANT_ID))
    await dbh.db
      .update(appStateTable)
      .set({
        value: { promptHash: hashObject('旧版种子提示词'), settingsHash: (await readFingerprint())!.settingsHash }
      })
      .where(eq(appStateTable.key, FINGERPRINT_KEY))

    seeder.run(dbh.db)

    const assistant = await readAssistant()
    expect(assistant.settings.temperature).toBe(0.3)
    expect(assistant.prompt).toBe(seededPrompt)
  })

  it('overwrites once on an install that predates fingerprinting, then starts tracking', async () => {
    const seeder = new PublishingAssistantSeeder()
    seeder.run(dbh.db)
    const seededPrompt = (await readAssistant()).prompt

    await writePrompt('我自己改的提示词')
    await dbh.db.delete(appStateTable).where(eq(appStateTable.key, FINGERPRINT_KEY))

    seeder.run(dbh.db)
    expect((await readAssistant()).prompt).toBe(seededPrompt)

    await writePrompt('这一次要保住')
    seeder.run(dbh.db)
    expect((await readAssistant()).prompt).toBe('这一次要保住')
  })

  it('renames an install whose fingerprint predates the name field', async () => {
    const seeder = new PublishingAssistantSeeder()
    seeder.run(dbh.db)
    const seeded = await readAssistant()

    // The state the release before the rename leaves: the old name, and a
    // fingerprint that tracked only prompt and settings.
    await dbh.db
      .update(assistantTable)
      .set({ name: '公众号发布助手', description: '将 Markdown 内容整理并创建为微信公众号草稿' })
      .where(eq(assistantTable.id, PUBLISHING_ASSISTANT_ID))
    const { promptHash, settingsHash } = (await readFingerprint())!
    await dbh.db
      .update(appStateTable)
      .set({ value: { promptHash, settingsHash } })
      .where(eq(appStateTable.key, FINGERPRINT_KEY))

    seeder.run(dbh.db)

    const upgraded = await readAssistant()
    expect(upgraded.name).toBe(seeded.name)
    expect(upgraded.description).toBe(seeded.description)
  })

  it('keeps a name the user chose', async () => {
    const seeder = new PublishingAssistantSeeder()
    seeder.run(dbh.db)
    await dbh.db
      .update(assistantTable)
      .set({ name: '我的写稿助手' })
      .where(eq(assistantTable.id, PUBLISHING_ASSISTANT_ID))

    seeder.run(dbh.db)
    seeder.run(dbh.db)

    expect((await readAssistant()).name).toBe('我的写稿助手')
  })
})
