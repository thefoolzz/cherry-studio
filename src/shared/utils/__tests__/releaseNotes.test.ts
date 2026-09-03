import { describe, expect, it } from 'vitest'

import {
  hasMultiLanguageReleaseNotes,
  localizeReleaseNotes,
  parseReleaseHistory,
  validateCurrentReleaseHistory
} from '../releaseNotes'

const releaseNotes = `<!--LANG:en-->
New features
- English item
<!--LANG:zh-CN-->
新功能
- 中文项目
<!--LANG:END-->`

describe('releaseNotes', () => {
  it.each(['zh-CN', 'zh-TW'])('returns Chinese notes for %s', (language) => {
    expect(localizeReleaseNotes(releaseNotes, language)).toBe('新功能\n- 中文项目')
  })

  it.each(['en-US', 'ja-JP', null])('returns English notes for %s', (language) => {
    expect(localizeReleaseNotes(releaseNotes, language)).toBe('New features\n- English item')
  })

  it('leaves unmarked release notes unchanged', () => {
    expect(localizeReleaseNotes('Simple release notes', 'zh-CN')).toBe('Simple release notes')
    expect(hasMultiLanguageReleaseNotes('Simple release notes')).toBe(false)
  })

  it('removes markers when a marked document is incomplete', () => {
    expect(localizeReleaseNotes('<!--LANG:en-->English only', 'zh-CN')).toBe('English only')
  })

  it('parses bundled stable release history without changing its order or bilingual notes', () => {
    expect(
      parseReleaseHistory(
        JSON.stringify([
          { releaseNotes, version: '2.0.1' },
          { releaseNotes, version: '2.0.0' }
        ])
      )
    ).toEqual([
      { releaseNotes, version: '2.0.1' },
      { releaseNotes, version: '2.0.0' }
    ])
  })

  it.each([
    ['invalid JSON', '{'],
    ['prerelease version', JSON.stringify([{ releaseNotes, version: '2.0.0-rc.1' }])],
    ['incomplete localization', JSON.stringify([{ releaseNotes: 'English only', version: '2.0.0' }])],
    [
      'duplicate version',
      JSON.stringify([
        { releaseNotes, version: '2.0.0' },
        { releaseNotes, version: '2.0.0' }
      ])
    ]
  ])('rejects %s in bundled history', (_case, source) => {
    expect(() => parseReleaseHistory(source)).toThrow('release-history.json')
  })

  it('accepts a stable current release whose bundled history notes match', () => {
    expect(() =>
      validateCurrentReleaseHistory({ releaseNotes, version: '2.0.2' }, [{ releaseNotes, version: '2.0.2' }])
    ).not.toThrow()
  })

  it('rejects a stable current release missing from bundled history', () => {
    expect(() => validateCurrentReleaseHistory({ releaseNotes, version: '2.0.2' }, [])).toThrow(
      'must contain current stable version 2.0.2'
    )
  })

  it('accepts bundled history notes that differ from the current stable release', () => {
    expect(() =>
      validateCurrentReleaseHistory({ releaseNotes, version: '2.0.2' }, [
        { releaseNotes: `${releaseNotes}\nChanged`, version: '2.0.2' }
      ])
    ).not.toThrow()
  })

  it('does not require prereleases in stable release history', () => {
    expect(() => validateCurrentReleaseHistory({ releaseNotes, version: '2.0.3-rc.1' }, [])).not.toThrow()
  })
})
