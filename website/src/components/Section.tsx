import type { ReactNode } from 'react'

interface SectionProps {
  id?: string
  eyebrow: string
  title: ReactNode
  lead?: string
  children?: ReactNode
}

/** 一屏一件事：小字眉标 + 大标题 + 一句话，下面压一块产品画面。 */
export function Section({ id, eyebrow, title, lead, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1120px] scroll-mt-10 px-6 py-20 text-center md:py-28">
      <p className="mono-label text-vermilion">{eyebrow}</p>
      <h2 className="mx-auto mt-4 max-w-[20ch] text-[clamp(1.9rem,5.2vw,3.4rem)]">{title}</h2>
      {lead ? <p className="mx-auto mt-6 max-w-[42ch] leading-[1.95] text-lead">{lead}</p> : null}
      {children ? <div className="mt-12 md:mt-16">{children}</div> : null}
    </section>
  )
}
