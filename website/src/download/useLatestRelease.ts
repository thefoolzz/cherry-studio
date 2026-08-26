import { useEffect, useState } from 'react'

import { REPO, type Release, type ReleaseAsset } from './assets'
import baked from './release.generated.json'

export type ReleaseSource = 'baked' | 'live'

export interface ReleaseState {
  release: Release
  /** baked = 构建期同步下来的兜底，live = 本次访问从 GitHub 拿到的最新 */
  source: ReleaseSource
}

const TIMEOUT_MS = 6000

interface RawAsset {
  name?: unknown
  browser_download_url?: unknown
  size?: unknown
}

function normalize(raw: unknown): Release | null {
  if (typeof raw !== 'object' || raw === null) return null
  const data = raw as { tag_name?: unknown; published_at?: unknown; draft?: unknown; assets?: unknown }
  if (data.draft === true) return null
  const assets: ReleaseAsset[] = (Array.isArray(data.assets) ? (data.assets as RawAsset[]) : []).flatMap((asset) =>
    typeof asset.name === 'string' && typeof asset.browser_download_url === 'string'
      ? [{ name: asset.name, url: asset.browser_download_url, size: typeof asset.size === 'number' ? asset.size : 0 }]
      : []
  )
  if (assets.length === 0) return null
  return {
    version: typeof data.tag_name === 'string' ? data.tag_name.replace(/^v/, '') : '',
    publishedAt: typeof data.published_at === 'string' ? data.published_at : null,
    assets
  }
}

/**
 * 永远先给出一份可下载的列表：构建期同步的那份。
 * 同时问一次 GitHub 拿最新 release，成功就替换掉。未认证的 API 是 60 次/小时/IP，
 * 国内也常连不上，所以这一步只做增量升级，失败不影响页面。
 */
export function useLatestRelease(): ReleaseState {
  const [state, setState] = useState<ReleaseState>({ release: baked as Release, source: 'baked' })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

    async function load(): Promise<void> {
      try {
        const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal
        })
        if (!response.ok) return
        const release = normalize((await response.json()) as unknown)
        if (release && active) setState({ release, source: 'live' })
      } catch {
        // 保持兜底那份，页面不出空态
      } finally {
        window.clearTimeout(timer)
      }
    }

    void load()
    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [])

  return state
}
