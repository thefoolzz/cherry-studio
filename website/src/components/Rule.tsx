export function Rule({ animate = false }: { animate?: boolean }) {
  return (
    <div aria-hidden="true" className={animate ? 'anim-rule' : undefined}>
      <div className="h-[3px] bg-ink" />
      <div className="mt-[3px] h-px bg-ink" />
    </div>
  )
}
