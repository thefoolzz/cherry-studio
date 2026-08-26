import { useEffect, useState } from 'react'

import { Section } from '../components/Section'
import { Frame } from '../demo/Frame'
import { Created, Progress, PublishDialog } from '../demo/parts'
import { TASK_STATES } from '../demo/timeline'
import { useInView } from '../hooks/useInView'

const PANELS = [
  { title: '选择账号', badge: '一次确认' },
  { title: '自动操作', badge: '无需切窗口' },
  { title: '结果', badge: '只到草稿箱' }
]

/** 进入视口后依次点亮三格，不用用户操作也能看完整流程。 */
function useReveal(active: boolean, count: number, interval: number): number {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!active || shown >= count) return
    const timer = window.setTimeout(() => setShown((value) => value + 1), shown === 0 ? 120 : interval)
    return () => window.clearTimeout(timer)
  }, [active, shown, count, interval])

  return shown
}

export function Publish() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const shown = useReveal(inView, PANELS.length, 700)

  return (
    <Section
      eyebrow="自动发布"
      id="publish"
      lead="选一个已绑定的公众号，剩下的它自己做：打开后台、上传配图、把草稿建好，再把可编辑链接交回来。"
      title="确认一次，草稿就躺在后台了">
      <div className="grid gap-6 md:grid-cols-3" ref={ref}>
        {PANELS.map((panel, index) => (
          <div
            className={`transition-all duration-500 ${index < shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
            key={panel.title}>
            <Frame badge={panel.badge} className="h-full" title={panel.title}>
              <div className="px-4 py-5 md:px-5">
                {index === 0 ? <PublishDialog /> : null}
                {index === 1 ? <Progress done={index < shown ? TASK_STATES.length : 0} /> : null}
                {index === 2 ? <Created /> : null}
              </div>
            </Frame>
          </div>
        ))}
      </div>
    </Section>
  )
}
