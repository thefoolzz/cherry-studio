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
  const groups = state.status === 'ready' ? buildGroups(state.release) : []
  const published = state.status === 'ready' ? formatDate(state.release.publishedAt) : null
  const eyebrow =
    state.status === 'ready'
      ? ['下载', state.release.version && `v${state.release.version}`, published].filter(Boolean).join(' · ')
      : '下载'

  return (
    <Section eyebrow={eyebrow} id="download" lead="装好打开就能用，公众号扫码登录一次即可。" title="拿去用">
      {groups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          {groups.map((group) => (
            <Card group={group} highlight={group.os === os} key={group.os} />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-[520px] border-[2px] border-ink/40 p-7">
          <p className="leading-relaxed">
            {state.status === 'loading' ? '正在取安装包列表。' : '暂时没取到安装包列表，去发布页直接选一个。'}
          </p>
          <a className={`${INK_BUTTON_OUTLINE} mt-6`} href={LATEST_RELEASE_URL}>
            全部安装包
          </a>
        </div>
      )}
      <p className="mx-auto mt-8 max-w-[40ch] text-sm text-lead">
        macOS 分 Apple 芯片与 Intel 两个包，别装错架构。
      </p>
    </Section>
  )
}
