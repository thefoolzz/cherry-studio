import { useEffect, useRef, useState } from 'react'

import { STEPS } from './timeline'

const TICK = 80
const TOTAL = STEPS.reduce((sum, step) => sum + step.duration, 0)

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface SequenceState {
  /** 当前步骤下标 */
  index: number
  /** 当前步骤内的进度 0–1，用于打字这类连续动效 */
  progress: number
}

/**
 * 循环推进演示步骤。离开视口就停表，`prefers-reduced-motion` 下直接停在最后一步，
 * 让不看动画的人也能看到完整结果。
 */
export function useSequence(active: boolean): SequenceState {
  const [elapsed, setElapsed] = useState(0)
  const reduced = useRef(prefersReducedMotion())

  useEffect(() => {
    if (!active || reduced.current) return
    const timer = window.setInterval(() => setElapsed((value) => (value + TICK) % TOTAL), TICK)
    return () => window.clearInterval(timer)
  }, [active])

  if (reduced.current) return { index: STEPS.length - 1, progress: 1 }

  let remaining = elapsed
  for (let index = 0; index < STEPS.length; index += 1) {
    const duration = STEPS[index].duration
    if (remaining < duration) return { index, progress: remaining / duration }
    remaining -= duration
  }
  return { index: STEPS.length - 1, progress: 1 }
}
