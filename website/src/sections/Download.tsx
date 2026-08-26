import { useState } from 'react'

import { INK_BUTTON, INK_BUTTON_OUTLINE } from '../components/buttons'
import { Section } from '../components/Section'
import { buildGroups, formatDate, formatSize, LATEST_RELEASE_URL, type OsGroup, type OsKey } from '../download/assets'
import type { ReleaseState } from '../download/useLatestRelease'

function Card({ group, highlight }: { group: OsGroup; highlight: boolean }) {
  return (
    <div
      className={`border-[2px] p-6 text-left ${highlight ? 'border-ink shadow-[7px_7px_0_var(--color-vermilion)]' : 'border-ink/40'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-2xl">{group.name}</h3>
        {highlight ? <span className="mono-label">你的系统</span> : null}
      </div>
      <div className="mt-5 flex flex-col items-start gap-3">
        {group.primary.map((item) => (
          <a className={INK_BUTTON} download href={item.asset.url} key={item.asset.name}>
            {item.label}
            <span className="text-paper/60">{formatSize(item.asset.size)}</span>
          </a>
        ))}
      </div>
      {group.extra.length > 0 ? (
        <ul className="mt-5 space-y-1.5 border-t border-ink/25 pt-4">
          {group.extra.map((item) => (
            <li key={item.asset.name}>
              <a
                className="font-mono text-[0.7rem] tracking-[0.14em] text-lead underline decoration-dotted underline-offset-4 hover:text-ink"
                download
                href={item.asset.url}>
                {item.label} · {formatSize(item.asset.size)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function Download({ state, os }: { state: ReleaseState; os: OsKey | null }) {
  const [showAll, setShowAll] = useState(false)
  const groups = buildGroups(state.release)
  const mine = os ? groups.filter((group) => group.os === os) : []
  const visible = !os || showAll || mine.length === 0 ? groups : mine
  const published = formatDate(state.release.publishedAt)
  const eyebrow = ['下载', state.release.version && `v${state.release.version}`, published].filter(Boolean).join(' · ')

  return (
    <Section eyebrow={eyebrow} id="download" lead="装好打开就能用，公众号扫码登录一次即可。" title="拿去用">
      {visible.length > 0 ? (
        <div className={visible.length > 1 ? 'grid gap-6 md:grid-cols-3' : 'mx-auto max-w-[420px]'}>
          {visible.map((group) => (
            <Card group={group} highlight={visible.length > 1 && group.os === os} key={group.os} />
          ))}
        </div>
      ) : (
        <a className={INK_BUTTON_OUTLINE} href={LATEST_RELEASE_URL}>
          全部安装包
        </a>
      )}
      {os && !showAll && mine.length > 0 && groups.length > mine.length ? (
        <button
          className="mx-auto mt-6 block font-mono text-[0.7rem] tracking-[0.14em] text-lead underline decoration-dotted underline-offset-4 hover:text-ink"
          onClick={() => setShowAll(true)}
          type="button">
          其他系统
        </button>
      ) : null}
      {visible.some((group) => group.os === 'mac') ? (
        <p className="mx-auto mt-8 max-w-[40ch] text-sm text-lead">macOS 分 Apple 芯片与 Intel 两个包，别装错架构。</p>
      ) : null}
    </Section>
  )
}
