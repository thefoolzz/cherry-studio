import { INK_BUTTON, INK_BUTTON_OUTLINE } from '../components/buttons'
import { Stage } from '../demo/Stage'
import { useSequence } from '../demo/useSequence'
import { buildGroups, formatSize, type OsKey } from '../download/assets'
import type { ReleaseState } from '../download/useLatestRelease'

function HeroDownload({ state, os }: { state: ReleaseState; os: OsKey | null }) {
  const group = os ? buildGroups(state.release).find((item) => item.os === os) : undefined
  const pick = group?.primary[0]

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
      {pick ? (
        <a className={INK_BUTTON} download href={pick.asset.url}>
          下载 {group?.name}
          <span className="text-paper/60">
            {pick.label} · {formatSize(pick.asset.size)}
          </span>
        </a>
      ) : (
        <a className={INK_BUTTON} href="#download">
          下载晨微
        </a>
      )}
      <a className={INK_BUTTON_OUTLINE} href="#download">
        全部平台
      </a>
    </div>
  )
}

export function Hero({ state, os }: { state: ReleaseState; os: OsKey | null }) {
  const sequence = useSequence(true)

  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pt-12 pb-20 text-center md:pt-20" id="top">
      <p className="mono-label text-vermilion">AI 营销工具 · 公众号自动发布</p>
      <h1 className="mx-auto mt-6 max-w-[14ch] text-[clamp(2.6rem,8.5vw,5.6rem)]">
        <span className="anim-rise block">不用写，</span>
        <span className="anim-rise block [animation-delay:130ms]">
          <span className="marker-bar">也不用排</span>。
        </span>
      </h1>
      <p className="anim-rise mx-auto mt-8 max-w-[34ch] text-lg leading-[1.95] [animation-delay:280ms]">
        说清目标，AI 出稿配图，自动把草稿建进公众号后台。
      </p>
      <p className="anim-rise mx-auto mt-3 max-w-[34ch] text-lead [animation-delay:340ms]">
        写稿、找图、搬运、排版一次做完，你只管审一遍。
      </p>
      <HeroDownload os={os} state={state} />
      <div className="mx-auto mt-16 max-w-[720px] md:mt-20">
        <Stage index={sequence.index} progress={sequence.progress} />
      </div>
    </section>
  )
}
