import { ACCOUNT, ARTICLE, CHECKS, FABRICATED, PROMPT, TASK_STATES, TRACE } from './timeline'

export function Composer({ typed }: { typed: string }) {
  return (
    <div className="border border-ink/25 bg-paper/60 px-4 py-3.5">
      <p className="min-h-[3.5rem] text-[0.95rem] leading-[1.8]">
        {typed}
        <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] bg-ink" />
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-ink/15 pt-2.5">
        <span className="text-[0.7rem] text-lead">按 Enter 发送</span>
        <span className="border border-ink bg-ink px-2.5 py-1 text-[0.7rem] text-paper">发送</span>
      </div>
    </div>
  )
}

export function Bubble() {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] border border-ink/25 bg-paper/70 px-3.5 py-2.5 text-[0.9rem] leading-[1.75]">
        {PROMPT}
      </p>
    </div>
  )
}

export function Trace({ visible }: { visible: number }) {
  return (
    <ul className="mt-5 space-y-2">
      {TRACE.map((line, index) => (
        <li
          key={line}
          className={`flex items-center gap-2.5 text-[0.85rem] transition-opacity duration-300 ${index < visible ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-vermilion">✓</span>
          <span className={index === visible - 1 ? '' : 'text-lead'}>{line}</span>
        </li>
      ))}
    </ul>
  )
}

export function Article({
  struck,
  drawn,
  withImage
}: {
  struck?: boolean
  /** 删改线是否已经划下去，用于滚动触发 */
  drawn?: boolean
  withImage?: boolean
}) {
  const strikeClass = `strike [text-decoration-line:none]${drawn ? ' struck' : ''}`
  return (
    <div>
      <h3 className="text-[1.35rem] leading-[1.35] md:text-[1.6rem]">{ARTICLE.title}</h3>
      {withImage ? (
        <figure className="mt-4">
          <img
            alt="海边公路上的大众 ID.4 傍晚出行场景"
            className="h-[168px] w-full border border-ink/20 object-cover md:h-[196px]"
            height={933}
            loading="lazy"
            src="/demo-cover.jpg"
            width={1400}
          />
          <figcaption className="mt-1.5 text-[0.7rem] text-lead">封面图 · 对话中生成</figcaption>
        </figure>
      ) : null}
      <p className="mt-4 text-[0.9rem] leading-[1.9]">{ARTICLE.paragraphs[0]}</p>
      <p className="mt-2.5 text-[0.9rem] leading-[1.9]">{ARTICLE.paragraphs[1]}</p>
      {struck ? (
        <p className="mt-2.5 text-[0.9rem] leading-[1.9]">
          车辆按<del className={strikeClass}>{FABRICATED[0]}</del>计费，可在
          <del className={strikeClass}>{FABRICATED[1]}</del>取车。
        </p>
      ) : null}
    </div>
  )
}

export function Checks() {
  return (
    <div className="mt-5 border-t border-dashed border-ink/35 pt-4">
      <p className="font-mono text-[0.8rem]">## 发布前检查（{CHECKS.length}）</p>
      <ol className="mt-2 space-y-1">
        {CHECKS.map((check, index) => (
          <li key={check} className="flex gap-2.5 text-[0.85rem]">
            <span className="text-vermilion">{index + 1}.</span>
            <span>{check}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[0.75rem] text-lead">这些内容不会写进正文，也不会阻止创建草稿。</p>
    </div>
  )
}

export function PublishDialog() {
  return (
    <div className="border-[2px] border-ink bg-surface p-5 shadow-[5px_5px_0_var(--color-ink)]">
      <p className="font-display text-lg font-black">选择发布账号</p>
      <p className="mt-1.5 text-[0.8rem] text-lead">文章会创建为微信公众号草稿，不会直接群发。</p>
      <p className="mt-4 text-[0.7rem] tracking-[0.1em] text-lead">发布账号</p>
      <div className="mt-2 flex items-center gap-3 border border-ink/30 px-3.5 py-3">
        <span aria-hidden="true" className="inline-block size-3 rounded-full border-[2px] border-vermilion" />
        <span className="text-[0.9rem]">{ACCOUNT.name}</span>
        <span className="text-[0.75rem] text-lead">{ACCOUNT.platform}</span>
      </div>
      <div className="mt-5 flex justify-end gap-2.5">
        <span className="border border-ink/40 px-3 py-1.5 text-[0.8rem] text-lead">取消</span>
        <span className="border border-ink bg-ink px-3 py-1.5 text-[0.8rem] text-paper">创建草稿</span>
      </div>
    </div>
  )
}

export function Progress({ done }: { done: number }) {
  return (
    <ul className="space-y-2.5">
      {TASK_STATES.map((state, index) => (
        <li key={state} className="flex items-center gap-3 text-[0.9rem]">
          <span className={index < done ? 'text-vermilion' : 'text-lead/50'}>{index < done ? '✓' : '·'}</span>
          <span className={index < done ? '' : 'text-lead/60'}>{state}</span>
        </li>
      ))}
    </ul>
  )
}

export function Created() {
  return (
    <div>
      <p className="stamp inline-block rotate-[-4deg] px-4 py-1.5 font-display text-xl">草稿已建</p>
      <p className="mt-5 text-[0.9rem] leading-[1.9]">文章已经躺在公众号后台的草稿箱里，标题、正文和配图都就位了。</p>
      <p className="mt-3 inline-flex items-center gap-2 border border-ink/30 px-3 py-1.5 text-[0.8rem]">
        <span className="text-vermilion">↗</span> 打开可编辑链接
      </p>
      <p className="mt-4 text-[0.75rem] text-lead">没有群发，没有定时发送。要不要真的发出去，你自己决定。</p>
    </div>
  )
}


