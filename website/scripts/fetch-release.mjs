import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'thefoolzz/cherry-studio'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../src/download/release.generated.json')

/** 更新元数据与增量补丁，不是给人下载的 */
const NOT_INSTALLERS = /\.(blockmap|yml|yaml|json|txt|sha\d+)$/i

const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
  headers: {
    Accept: 'application/vnd.github+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  }
})

if (!response.ok) {
  console.error(`GitHub API ${response.status}: ${await response.text()}`)
  console.error('未认证的 API 是 60 次/小时/IP，被限流时用 GITHUB_TOKEN=<token> 再跑一次。')
  process.exit(1)
}

const data = await response.json()
if (data.draft) {
  console.error(`最新 release ${data.tag_name} 还是草稿，先发布再同步。`)
  process.exit(1)
}

const release = {
  version: String(data.tag_name ?? '').replace(/^v/, ''),
  publishedAt: data.published_at ?? null,
  assets: (data.assets ?? [])
    .filter((asset) => !NOT_INSTALLERS.test(asset.name))
    .map((asset) => ({ name: asset.name, url: asset.browser_download_url, size: asset.size }))
}

if (release.assets.length === 0) {
  console.error(`release ${data.tag_name} 里没有可下载的安装包。`)
  process.exit(1)
}

writeFileSync(OUT, `${JSON.stringify(release, null, 2)}\n`)
console.log(`已写入 v${release.version}（${release.assets.length} 个安装包）→ src/download/release.generated.json`)
