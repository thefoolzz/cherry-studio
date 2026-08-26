export const REPO = 'thefoolzz/cherry-studio'
export const RELEASES_URL = `https://github.com/${REPO}/releases`
export const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`

export interface ReleaseAsset {
  name: string
  url: string
  size: number
}

export interface Release {
  version: string
  publishedAt: string | null
  assets: ReleaseAsset[]
}

export type OsKey = 'mac' | 'win' | 'linux'

export interface DownloadItem {
  label: string
  asset: ReleaseAsset
}

export interface OsGroup {
  os: OsKey
  name: string
  primary: DownloadItem[]
  extra: DownloadItem[]
}

interface Matcher {
  label: string
  match: (lowerName: string) => boolean
}

/** 更新元数据与增量补丁，不是给人下载的 */
const NOT_INSTALLERS = /\.(blockmap|yml|yaml|json|txt|sha\d+)$/i

/**
 * 产物名以真实 release 为准，各平台打包器的架构词并不统一：
 * Windows 安装版是 `CherryStudio-Setup-<version>[-arm64].exe`，macOS x64 的 zip 没有架构词，
 * Linux 的 deb 用 amd64、rpm 用 x86_64/aarch64。所以按名字判断而不是拼文件名。
 */
const MATCHERS: Record<OsKey, { name: string; primary: Matcher[]; extra: Matcher[] }> = {
  mac: {
    name: 'macOS',
    primary: [
      { label: 'Apple 芯片 · dmg', match: (name) => name.endsWith('-arm64.dmg') },
      { label: 'Intel · dmg', match: (name) => name.endsWith('-x64.dmg') }
    ],
    extra: [
      { label: 'Apple 芯片 · zip', match: (name) => name.endsWith('-arm64-mac.zip') },
      { label: 'Intel · zip', match: (name) => name.endsWith('-mac.zip') && !name.includes('arm64') }
    ]
  },
  win: {
    name: 'Windows',
    primary: [
      { label: 'x64 · 安装版', match: (name) => name.includes('-setup-') && name.endsWith('.exe') && !name.includes('arm64') },
      { label: 'ARM64 · 安装版', match: (name) => name.includes('-setup-') && name.endsWith('arm64.exe') }
    ],
    extra: [
      { label: 'x64 · 免安装', match: (name) => name.endsWith('-x64-portable.exe') },
      { label: 'ARM64 · 免安装', match: (name) => name.endsWith('-arm64-portable.exe') }
    ]
  },
  linux: {
    name: 'Linux',
    primary: [
      { label: 'x86_64 · AppImage', match: (name) => name.endsWith('x86_64.appimage') },
      { label: 'ARM64 · AppImage', match: (name) => name.endsWith('arm64.appimage') }
    ],
    extra: [
      { label: 'x86_64 · deb', match: (name) => name.endsWith('amd64.deb') },
      { label: 'ARM64 · deb', match: (name) => name.endsWith('arm64.deb') },
      { label: 'x86_64 · rpm', match: (name) => name.endsWith('x86_64.rpm') },
      { label: 'ARM64 · rpm', match: (name) => name.endsWith('aarch64.rpm') }
    ]
  }
}

const OS_ORDER: OsKey[] = ['mac', 'win', 'linux']

function pick(assets: ReleaseAsset[], matchers: Matcher[]): DownloadItem[] {
  return matchers.flatMap((matcher) => {
    const asset = assets.find((candidate) => matcher.match(candidate.name.toLowerCase()))
    return asset ? [{ label: matcher.label, asset }] : []
  })
}

export function buildGroups(release: Release): OsGroup[] {
  const assets = release.assets.filter((asset) => !NOT_INSTALLERS.test(asset.name))
  return OS_ORDER.map((os) => {
    const config = MATCHERS[os]
    return {
      os,
      name: config.name,
      primary: pick(assets, config.primary),
      extra: pick(assets, config.extra)
    }
  }).filter((group) => group.primary.length > 0 || group.extra.length > 0)
}

interface NavigatorUAData {
  userAgentData?: { platform?: string }
}

export function detectOs(): OsKey | null {
  const platform = (navigator as Navigator & NavigatorUAData).userAgentData?.platform ?? navigator.platform ?? ''
  const probe = `${platform} ${navigator.userAgent}`.toLowerCase()
  if (/mac|darwin|iphone|ipad/.test(probe)) return 'mac'
  if (/win/.test(probe)) return 'win'
  if (/linux|x11|android|cros/.test(probe)) return 'linux'
  return null
}

export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}
