import type { ReactNode } from 'react'

interface FrameProps {
  title: string
  badge?: string
  children: ReactNode
  className?: string
}

/** 演示用的“窗口”：硬边框 + 硬投影，和纸面语言一致，不做圆角玻璃那套。 */
export function Frame({ title, badge, children, className }: FrameProps) {
  return (
    <div
      className={`border-[2px] border-ink bg-surface text-left shadow-[8px_8px_0_var(--color-ink)] ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-4 border-b border-ink/20 px-4 py-2.5 md:px-5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="inline-block size-2.5 border border-ink" />
          <span className="text-xs tracking-[0.08em] text-lead">{title}</span>
        </div>
        {badge ? (
          <span className="border border-ink/30 px-2 py-0.5 text-[0.65rem] tracking-[0.08em] text-lead">{badge}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}
