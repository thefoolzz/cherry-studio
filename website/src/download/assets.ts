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
 * 只认扩展名、`setup`/`portable` 和架构词，不认品牌前缀：改 `electron-builder.yml` 的
 * artifactName 之后旧 release（`*-Setup-<version>.exe`、`*-mac.zip`）的按钮也还在。
 * 架构词各打包器不统一，deb 用 amd64、rpm/AppImage 用 x86_64/aarch64，所以只判断是不是 ARM。
 */
const isArm64 = (name: string) => /arm64|aarch64/.test(name)

const MATCHERS: Record<OsKey, { name: string; primary: Matcher[]; extra: Matcher[] }> = {
  mac: {
    name: 'macOS',
    primary: [
      { label: 'Apple 芯片 · dmg', match: (name) => name.endsWith('.dmg') && isArm64(name) },
      { label: 'Intel · dmg', match: (name) => name.endsWith('.dmg') && !isArm64(name) }
    ],
    extra: [
      { label: 'Apple 芯片 · zip', match: (name) => name.endsWith('.zip') && isArm64(name) },
      { label: 'Intel · zip', match: (name) => name.endsWith('.zip') && !isArm64(name) }
    ]
  },
  win: {
    name: 'Windows',
    primary: [
      { label: 'x64 · 安装版', match: (name) => name.endsWith('.exe') && name.includes('setup') && !isArm64(name) },
      { label: 'ARM64 · 安装版', match: (name) => name.endsWith('.exe') && name.includes('setup') && isArm64(name) }
    ],
    extra: [
      { label: 'x64 · 免安装', match: (name) => name.endsWith('.exe') && name.includes('portable') && !isArm64(name) },
      { label: 'ARM64 · 免安装', match: (name) => name.endsWith('.exe') && name.includes('portable') && isArm64(name) }
    ]
  },
  linux: {
    name: 'Linux',
    primary: [
      { label: 'x86_64 · AppImage', match: (name) => name.endsWith('.appimage') && !isArm64(name) },
      { label: 'ARM64 · AppImage', match: (name) => name.endsWith('.appimage') && isArm64(name) }
    ],
    extra: [
      { label: 'x86_64 · deb', match: (name) => name.endsWith('.deb') && !isArm64(name) },
      { label: 'ARM64 · deb', match: (name) => name.endsWith('.deb') && isArm64(name) },
      { label: 'x86_64 · rpm', match: (name) => name.endsWith('.rpm') && !isArm64(name) },
      { label: 'ARM64 · rpm', match: (name) => name.endsWith('.rpm') && isArm64(name) }
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
