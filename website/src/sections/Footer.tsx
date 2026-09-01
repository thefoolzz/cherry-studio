import { Rule } from '../components/Rule'

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1120px] px-6 pb-16">
      <Rule />
      <div className="mt-12">
        <p className="font-display text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.14] font-black">
          让 AI 把稿子写完，
          <br />
          把草稿建好。
        </p>
        <p className="mt-5 max-w-[38ch] text-lead">选题、成稿、配图、进草稿箱，一路不用切窗口。</p>
      </div>
      <div className="mt-16">
        <div className="h-px bg-ink/25" />
        <div className="mt-4">
          <span className="mono-label">chenwei · AI 内容生产与自动发布</span>
        </div>
      </div>
    </footer>
  )
}
