const NAV = [
  { href: '#proof', label: '不编造' },
  { href: '#publish', label: '自动发布' },
  { href: '#platforms', label: '平台' },
  { href: '#download', label: '下载' }
]

export function Masthead() {
  return (
    <header className="mx-auto w-full max-w-[1120px] px-6 pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-ink/25 pb-4">
        <a className="font-display text-3xl font-black tracking-[-0.05em]" href="#top">
          chenwei
        </a>
        <nav aria-label="主导航" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {NAV.map((item) => (
            <a
              className="text-sm tracking-[0.06em] text-lead underline decoration-ink/25 decoration-1 underline-offset-[6px] hover:text-ink hover:decoration-vermilion hover:decoration-2"
              href={item.href}
              key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
