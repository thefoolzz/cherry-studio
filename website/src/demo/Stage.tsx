import { Frame } from './Frame'
import { Article, Bubble, Checks, Composer, Created, Progress, PublishDialog, Trace } from './parts'
import { PROMPT, STEPS, TASK_STATES, TRACE } from './timeline'
import type { SequenceState } from './useSequence'

function body({ index, progress }: SequenceState) {
  switch (STEPS[index].key) {
    case 'ask':
      return <Composer typed={PROMPT.slice(0, Math.min(PROMPT.length, Math.ceil(progress * 1.25 * PROMPT.length)))} />
    case 'think':
      return (
        <>
          <Bubble />
          <Trace visible={Math.min(TRACE.length, Math.floor(progress * (TRACE.length + 0.4)) + 1)} />
        </>
      )
    case 'draft':
      return <Article withImage />
    case 'proof':
      return (
        <>
          <Article drawn struck />
          <Checks />
        </>
      )
    case 'publish':
      if (progress < 0.4) return <PublishDialog />
      if (progress < 0.78) return <Progress done={Math.ceil(((progress - 0.4) / 0.38) * TASK_STATES.length)} />
      return <Created />
  }
}

export function Stage({ index, progress }: SequenceState) {
  return (
    <Frame badge={`${index + 1} / ${STEPS.length}`} title="chenwei · 多平台发布助手">
      <div className="h-[356px] overflow-hidden px-5 py-5 md:h-[420px] md:px-7 md:py-6">
        <div key={STEPS[index].key} className="anim-rise">
          {body({ index, progress })}
        </div>
      </div>
      <ol className="flex border-t border-ink/20">
        {STEPS.map((step, position) => (
          <li
            key={step.key}
            className={`flex-1 border-r border-ink/10 px-1 py-2 text-center text-[0.7rem] last:border-r-0 ${
              position === index ? 'bg-marker/70 text-ink' : 'text-lead'
            }`}>
            {step.label}
          </li>
        ))}
      </ol>
    </Frame>
  )
}
