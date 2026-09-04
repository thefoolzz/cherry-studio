import { preferenceTable } from '@data/db/schemas/preference'
import { DefaultPreferences } from '@shared/data/preference/preferenceSchemas'
import { and, eq } from 'drizzle-orm'

import type { DbType, ISeeder } from '../../types'
import { hashObject } from '../hashObject'

const SIDEBAR_FAVORITES_KEY = 'ui.sidebar.favorites'

const isUntouchedChatOnlySidebar = (preference: typeof preferenceTable.$inferSelect): boolean => {
  const value = preference.value
  return (
    preference.scope === 'default' &&
    preference.key === SIDEBAR_FAVORITES_KEY &&
    preference.createdAt === preference.updatedAt &&
    Array.isArray(value) &&
    value.length === 1 &&
    value[0]?.id === 'assistants' &&
    value[0]?.type === 'app'
  )
}

export class PreferenceSeeder implements ISeeder {
  readonly name = 'preference'
  readonly description = 'Insert default preference values'
  readonly version: string

  constructor() {
    this.version = hashObject(DefaultPreferences)
  }

  run(db: DbType): void {
    const preferences = db.select().from(preferenceTable).all()

    if (preferences.some(isUntouchedChatOnlySidebar)) {
      db.update(preferenceTable)
        .set({ value: DefaultPreferences.default[SIDEBAR_FAVORITES_KEY] })
        .where(and(eq(preferenceTable.scope, 'default'), eq(preferenceTable.key, SIDEBAR_FAVORITES_KEY)))
        .run()
    }

    // Convert existing preferences to a Map for quick lookup
    const existingPrefs = new Map(preferences.map((p) => [`${p.scope}.${p.key}`, p]))

    // Collect all new preferences to insert
    const newPreferences: Array<{
      scope: string
      key: string
      value: unknown
    }> = []

    // Process each scope in defaultPreferences
    for (const [scope, scopeData] of Object.entries(DefaultPreferences)) {
      // Process each key-value pair in the scope
      for (const [key, value] of Object.entries(scopeData)) {
        const prefKey = `${scope}.${key}`

        // Skip if this preference already exists
        if (existingPrefs.has(prefKey)) {
          continue
        }

        // Add to new preferences array
        newPreferences.push({
          scope,
          key,
          value
        })
      }
    }

    // If there are new preferences to insert, do it
    if (newPreferences.length > 0) {
      db.insert(preferenceTable).values(newPreferences).run()
    }
  }
}
